FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 libgomp1 build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./requirements.txt

# Keep the API runtime CPU-only. Qwen3-TTS runs in its separate PyTorch service.
# PyPI defaults to TorchCodec's CUDA wheel on Linux; install the matching CPU wheel.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch torchaudio \
    && pip install -r requirements.txt \
    && pip install --force-reinstall --no-deps \
       --index-url https://download.pytorch.org/whl/cpu torchcodec==0.17.0

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
