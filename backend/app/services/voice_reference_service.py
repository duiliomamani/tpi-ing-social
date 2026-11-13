import time
import uuid
from typing import Any, Dict, Iterable, List, Optional, Tuple

import soundfile as sf

from app.core.config import ensure_data_directories, settings
from app.services.transcription_service import transcription_service


class VoiceReferenceService:
    """Transcribe long local recordings and prepare a short F5-compatible excerpt."""

    MIN_CLIP_SECONDS = 5.0
    MAX_CLIP_SECONDS = settings.MAX_VOICE_REFERENCE_DURATION_SECONDS
    MAX_WORD_GAP_SECONDS = 1.25
    CLIP_PADDING_SECONDS = 0.08

    @staticmethod
    def _result_error(result: Dict[str, Any]) -> Optional[str]:
        if result.get("engine") in {"offline-fallback", "faster-whisper-error-fallback"}:
            return str(result.get("transcript") or "Whisper local no está disponible.")
        return None

    @staticmethod
    def _score_window(
        start: float,
        end: float,
        text: str,
        probabilities: Iterable[float],
        voiced_seconds: float,
    ) -> float:
        duration = end - start
        if duration <= 0:
            return float("-inf")

        confidence_values = list(probabilities)
        confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0.75
        duration_score = max(0.0, 1.0 - abs(duration - 8.0) / 8.0)
        speech_ratio = min(1.0, voiced_seconds / duration)
        text_density = min(1.0, len(text.strip()) / max(duration * 8.0, 1.0))
        punctuation_bonus = 0.08 if text.rstrip().endswith((".", "?", "!", "…")) else 0.0
        return 0.45 * duration_score + 0.3 * confidence + 0.15 * speech_ratio + 0.1 * text_density + punctuation_bonus

    def _candidate_windows(
        self,
        segments: List[Dict[str, Any]],
        source_duration: float,
    ) -> List[Tuple[float, float, float]]:
        words = [
            word
            for segment in segments
            for word in segment.get("words", [])
            if str(word.get("text", "")).strip()
            and float(word.get("end", 0.0)) > float(word.get("start", 0.0))
        ]
        words.sort(key=lambda word: float(word["start"]))

        candidates: List[Tuple[float, float, float]] = []
        if words:
            for start_index in range(len(words)):
                window_words: List[Dict[str, Any]] = []
                for end_index in range(start_index, len(words)):
                    word = words[end_index]
                    if window_words:
                        gap = float(word["start"]) - float(window_words[-1]["end"])
                        if gap > self.MAX_WORD_GAP_SECONDS:
                            break

                    window_words.append(word)
                    raw_start = float(window_words[0]["start"])
                    raw_end = float(window_words[-1]["end"])
                    raw_duration = raw_end - raw_start
                    if raw_duration > self.MAX_CLIP_SECONDS - 2 * self.CLIP_PADDING_SECONDS:
                        break
                    if raw_duration < self.MIN_CLIP_SECONDS:
                        continue

                    transcript = "".join(str(item["text"]) for item in window_words).strip()
                    if len(transcript) < 12:
                        continue

                    clip_start = max(0.0, raw_start - self.CLIP_PADDING_SECONDS)
                    clip_end = min(source_duration, raw_end + self.CLIP_PADDING_SECONDS)
                    if not self.MIN_CLIP_SECONDS <= clip_end - clip_start <= self.MAX_CLIP_SECONDS:
                        continue

                    probabilities = [float(item.get("probability", 0.75)) for item in window_words]
                    voiced = sum(
                        max(0.0, float(item["end"]) - float(item["start"]))
                        for item in window_words
                    )
                    score = self._score_window(
                        clip_start,
                        clip_end,
                        transcript,
                        probabilities,
                        voiced,
                    )
                    candidates.append((clip_start, clip_end, score))

        if candidates:
            return candidates

        # Fallback for Whisper builds that return segment timestamps but no word timestamps.
        speech_segments = [
            segment
            for segment in segments
            if str(segment.get("text", "")).strip()
            and float(segment.get("end", 0.0)) > float(segment.get("start", 0.0))
        ]
        for start_index in range(len(speech_segments)):
            window: List[Dict[str, Any]] = []
            for end_index in range(start_index, len(speech_segments)):
                segment = speech_segments[end_index]
                if window and float(segment["start"]) - float(window[-1]["end"]) > self.MAX_WORD_GAP_SECONDS:
                    break
                window.append(segment)
                raw_start = float(window[0]["start"])
                raw_end = float(window[-1]["end"])
                raw_duration = raw_end - raw_start
                if raw_duration > self.MAX_CLIP_SECONDS - 2 * self.CLIP_PADDING_SECONDS:
                    break
                if raw_duration < self.MIN_CLIP_SECONDS:
                    continue

                transcript = " ".join(str(item["text"]).strip() for item in window).strip()
                clip_start = max(0.0, raw_start - self.CLIP_PADDING_SECONDS)
                clip_end = min(source_duration, raw_end + self.CLIP_PADDING_SECONDS)
                if not self.MIN_CLIP_SECONDS <= clip_end - clip_start <= self.MAX_CLIP_SECONDS:
                    continue

                voiced = sum(float(item["end"]) - float(item["start"]) for item in window)
                score = self._score_window(clip_start, clip_end, transcript, [], voiced)
                candidates.append((clip_start, clip_end, score))

        return candidates

    @staticmethod
    def _extract_clip(source_path: str, output_path: str, start: float, end: float) -> Dict[str, Any]:
        ensure_data_directories()
        with sf.SoundFile(source_path) as source:
            sample_rate = int(source.samplerate)
            source.seek(max(0, int(start * sample_rate)))
            audio = source.read(
                frames=max(1, int((end - start) * sample_rate)),
                dtype="float32",
                always_2d=True,
            )

        if audio.size == 0:
            raise ValueError("No se pudo extraer el fragmento de referencia seleccionado.")

        mono = audio.mean(axis=1) if audio.shape[1] > 1 else audio[:, 0]
        sf.write(output_path, mono, sample_rate, subtype="PCM_16")
        info = sf.info(output_path)
        return {
            "duration_seconds": round(float(info.duration), 2),
            "sample_rate": int(info.samplerate),
            "channels": int(info.channels),
        }

    def transcribe_and_prepare(
        self,
        source_audio_id: str,
        source_path: str,
        clip_start_seconds: Optional[float] = None,
        clip_end_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        ensure_data_directories()
        started_at = time.time()
        source_info = sf.info(source_path)
        source_duration = float(source_info.duration)
        if source_duration > settings.MAX_VOICE_SOURCE_DURATION_SECONDS:
            raise ValueError(
                f"La grabación dura {source_duration:.1f} s. El máximo para transcripción local es "
                f"{settings.MAX_VOICE_SOURCE_DURATION_SECONDS / 60:.0f} minutos."
            )
        if source_duration < 1.0:
            raise ValueError("La grabación debe contener al menos un segundo de audio.")

        if (clip_start_seconds is None) != (clip_end_seconds is None):
            raise ValueError("Indique tanto el inicio como el fin del recorte manual.")

        manual_selection = clip_start_seconds is not None and clip_end_seconds is not None
        source_result: Optional[Dict[str, Any]] = None
        reference_result: Dict[str, Any]
        source_transcript = ""
        clip_start = 0.0
        clip_end = source_duration
        reference_audio_id = source_audio_id
        clip_info = {
            "duration_seconds": round(source_duration, 2),
            "sample_rate": int(source_info.samplerate),
            "channels": int(source_info.channels),
        }

        if manual_selection:
            clip_start = float(clip_start_seconds)
            clip_end = float(clip_end_seconds)
            clip_duration = clip_end - clip_start
            if clip_start < 0 or clip_end > source_duration or clip_duration <= 0:
                raise ValueError("El recorte debe estar dentro de los límites de la grabación.")
            if not self.MIN_CLIP_SECONDS <= clip_duration <= self.MAX_CLIP_SECONDS:
                raise ValueError("Seleccione un fragmento de voz de entre 5 y 12 segundos.")

            reference_audio_id = f"ref_{uuid.uuid4().hex[:10]}"
            reference_path = settings.UPLOADS_DIR / f"{reference_audio_id}.wav"
            try:
                clip_info = self._extract_clip(source_path, str(reference_path), clip_start, clip_end)
                reference_result = transcription_service.transcribe_audio(
                    str(reference_path),
                    language=settings.WHISPER_LANGUAGE,
                    beam_size=1,
                )
                error = self._result_error(reference_result)
                if error:
                    raise RuntimeError(error)
            except Exception:
                if reference_path.exists():
                    reference_path.unlink()
                raise
        elif source_duration > self.MAX_CLIP_SECONDS:
            # Keep automatic selection for API clients that do not provide explicit bounds.
            source_result = transcription_service.transcribe_audio(
                source_path,
                language=settings.WHISPER_LANGUAGE,
                beam_size=1,
                word_timestamps=True,
            )
            error = self._result_error(source_result)
            if error:
                raise RuntimeError(error)

            source_transcript = str(source_result.get("transcript", "")).strip()
            if not source_transcript:
                raise ValueError("Whisper no detectó voz transcribible en la grabación.")

            candidates = self._candidate_windows(source_result.get("segments", []), source_duration)
            if not candidates:
                raise ValueError(
                    "No se encontró un tramo continuo de voz de 5–12 s. "
                    "Seleccione manualmente el inicio y el fin del recorte."
                )

            clip_start, clip_end, _ = max(candidates, key=lambda candidate: candidate[2])
            reference_audio_id = f"ref_{uuid.uuid4().hex[:10]}"
            reference_path = settings.UPLOADS_DIR / f"{reference_audio_id}.wav"
            try:
                clip_info = self._extract_clip(source_path, str(reference_path), clip_start, clip_end)
                reference_result = transcription_service.transcribe_audio(
                    str(reference_path),
                    language=settings.WHISPER_LANGUAGE,
                    beam_size=1,
                )
                error = self._result_error(reference_result)
                if error:
                    raise RuntimeError(error)
            except Exception:
                if reference_path.exists():
                    reference_path.unlink()
                raise
        else:
            reference_result = transcription_service.transcribe_audio(
                source_path,
                language=settings.WHISPER_LANGUAGE,
                beam_size=1,
            )
            error = self._result_error(reference_result)
            if error:
                raise RuntimeError(error)
            source_transcript = str(reference_result.get("transcript", "")).strip()

        reference_transcript = str(reference_result.get("transcript", "")).strip()
        if not reference_transcript:
            raise ValueError("Whisper no detectó voz transcribible en el fragmento seleccionado.")
        metadata_result = source_result or reference_result

        return {
            "source_audio_id": source_audio_id,
            "reference_audio_id": reference_audio_id,
            "source_transcript": source_transcript,
            "reference_transcript": reference_transcript,
            "audio_url": f"/api/audio/{reference_audio_id}.wav",
            "source_duration_seconds": round(source_duration, 2),
            "duration_seconds": clip_info["duration_seconds"],
            "sample_rate": clip_info["sample_rate"],
            "channels": clip_info["channels"],
            "clip_start_seconds": round(clip_start, 2),
            "clip_end_seconds": round(clip_end, 2),
            "language": metadata_result.get("language") or settings.WHISPER_LANGUAGE,
            "language_probability": float(metadata_result.get("language_probability") or 0.0),
            "transcription_time_ms": round((time.time() - started_at) * 1000, 2),
            "engine": metadata_result.get("engine", "faster-whisper"),
        }


voice_reference_service = VoiceReferenceService()
