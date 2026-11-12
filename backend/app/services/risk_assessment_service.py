from typing import Dict, Any, List
from app.models.schemas import (
    MultilayerRiskAssessmentResponse,
    DimensionEvidence,
    AudioAnalysisResponse,
    SocialEngineeringAnalysisResponse
)
from app.core.database import save_analysis_record

class RiskAssessmentService:
    def evaluate_risk(
        self,
        audio_id: str,
        acoustic_analysis: AudioAnalysisResponse,
        social_analysis: SocialEngineeringAnalysisResponse,
        verified_identity: bool = False
    ) -> MultilayerRiskAssessmentResponse:
        """
        Matriz de evaluación de confianza multicapa (Defensa en Profundidad).
        Analiza de manera independiente las 4 dimensiones operativas.
        """
        dimensions: List[DimensionEvidence] = []

        # ---------------------------------------------
        # Dimensión A: Evidencia Acústica (AASIST)
        # ---------------------------------------------
        aasist = acoustic_analysis.acoustic_detection
        if aasist.verdict == "Evidencia de síntesis":
            dim_a_risk = "critico" if aasist.raw_score > 1.5 else "alto"
            dim_a_summary = f"Firma acústica sintética detectada (Score AASIST: {aasist.raw_score:+.3f})"
        elif aasist.verdict == "Evidencia compatible con voz humana":
            dim_a_risk = "bajo"
            dim_a_summary = f"Características acústicas biológicas plausibles (Score AASIST: {aasist.raw_score:+.3f})"
        else:
            dim_a_risk = "medio"
            dim_a_summary = f"Patrones acústicos indeterminados (Score AASIST: {aasist.raw_score:+.3f})"

        dimensions.append(DimensionEvidence(
            dimension_code="A_acustica",
            dimension_name="Evidencia Acústica Forense (AASIST)",
            indicator_summary=dim_a_summary,
            risk_contribution=dim_a_risk,
            technical_detail=aasist.technical_interpretation
        ))

        # ---------------------------------------------
        # Dimensión B: Evidencia de Procedencia (PerTh)
        # ---------------------------------------------
        wm = acoustic_analysis.watermark_detection
        if wm.detected:
            dim_b_risk = "critico"
            dim_b_summary = f"Marca de agua de sintetizador identificada (Índice PerTh: {wm.correlation_score:.2f})"
        else:
            dim_b_risk = "neutro"
            dim_b_summary = "Sin marcas de agua conocidas detectadas en el espectro"

        dimensions.append(DimensionEvidence(
            dimension_code="B_procedencia",
            dimension_name="Evidencia de Procedencia y Firma (PerTh)",
            indicator_summary=dim_b_summary,
            risk_contribution=dim_b_risk,
            technical_detail=wm.interpretation
        ))

        # ---------------------------------------------
        # Dimensión C: Riesgo de Ingeniería Social (Gemma)
        # ---------------------------------------------
        sem_score = social_analysis.semantic_risk_score
        detected_factors = [f for f in social_analysis.factors if f.estado == "detectado"]
        sensitive_request = any(
            f.factor_id in ["solicitud_informacion_sensible", "solicitud_pagos_transferencias"]
            for f in detected_factors
        )
        urgency_or_authority = any(
            f.factor_id in ["urgencia_artificial", "autoridad_declarada", "amenazas_consecuencias_negativas"]
            for f in detected_factors
        )

        if sem_score >= 65.0:
            dim_c_risk = "critico" if sem_score >= 80.0 else "alto"
        elif sem_score >= 30.0:
            dim_c_risk = "medio"
        else:
            dim_c_risk = "bajo"

        dim_c_summary = (
            f"{len(detected_factors)} factores de manipulación detectados "
            f"(Puntuación semántica: {sem_score:.1f}/100)"
        )

        dimensions.append(DimensionEvidence(
            dimension_code="C_ingenieria_social",
            dimension_name="Análisis de Ingeniería Social (Gemma 3 4B)",
            indicator_summary=dim_c_summary,
            risk_contribution=dim_c_risk,
            technical_detail=social_analysis.summary
        ))

        # ---------------------------------------------
        # Dimensión D: Verificación Independiente de Identidad
        # ---------------------------------------------
        if verified_identity:
            dim_d_risk = "bajo"
            dim_d_summary = "Identidad y autorización confirmadas por canal fuera de banda confiable"
        else:
            dim_d_risk = "alto" if sensitive_request else "medio"
            dim_d_summary = "Identidad NO verificada por canal alternativo independiente"

        dimensions.append(DimensionEvidence(
            dimension_code="D_verificacion_identidad",
            dimension_name="Verificación Fuera de Banda (Out-of-Band)",
            indicator_summary=dim_d_summary,
            risk_contribution=dim_d_risk,
            technical_detail="Confirmación mediante llamada inversa a número corporativo registrado o clave preacordada."
        ))

        # ---------------------------------------------
        # Reglas de Decisión Operativa
        # ---------------------------------------------
        action_protocol: List[str] = []
        applied_rule: str = ""

        # REGLA 1: Síntesis confirmada (Acústica crítica o Watermark presente)
        if wm.detected or aasist.verdict == "Evidencia de síntesis":
            operational_level = "CRITICO"
            applied_rule = "REGLA-01: Evidencia concluyente de voz artificial generada por IA."
            operational_recommendation = (
                "INTERRUMPIR LA COMUNICACIÓN INMEDIATAMENTE. Se detectó síntesis de voz automatizada "
                "con suplantación activa de identidad."
            )
            action_protocol = [
                "1. Colgar la llamada de inmediato sin brindar confirmación alguna.",
                "2. Reportar el incidente al Equipo de Respuesta a Incidentes (CSIRT / SOC).",
                "3. Contactar a la persona supuestamente emisora por un canal institucional alternativo para alertarla.",
                "4. Preservar la grabación para análisis forense del laboratorio."
            ]

        # REGLA 2: Regla de Oro — Petición sensible sin verificación fuera de banda
        elif sensitive_request and not verified_identity:
            operational_level = "ALTO"
            applied_rule = "REGLA DE ORO (DEFENSA EN PROFUNDIDAD): Solicitud crítica sin validación fuera de banda."
            operational_recommendation = (
                "DETENER LA ACCIÓN Y CONFIRMAR POR CANAL INDEPENDIENTE. Aunque los modelos acústicos no sean concluyentes "
                "o la voz suene natural, la presencia de solicitudes sensibles sin verificación out-of-band impone máxima cautela."
            )
            action_protocol = [
                "1. No entregar contraseñas, códigos OTP, ni autorizar transferencias bajo ninguna circunstancia.",
                "2. Informar al interlocutor que la política exige validación por canal alternativo.",
                "3. Cortar la llamada y marcar al número oficial preestablecido de la organización.",
                "4. Solicitar autorización formal por el sistema de tickets corporativo."
            ]

        # REGLA 3: Alta manipulación psicológica detectada
        elif sem_score >= 60.0:
            operational_level = "ALTO"
            applied_rule = "REGLA-03: Alta densidad de vectores de manipulación y presión psicológica."
            operational_recommendation = (
                "COMUNICACIÓN SOSPECHOSA DE VISHING. Se detectaron múltiples indicadores de urgencia artificial, "
                "intento de evitar canales o presión emocional."
            )
            action_protocol = [
                "1. Rechazar peticiones fuera de procedimiento ordinario.",
                "2. Verificar la legitimidad del requerimiento con la jefatura directa.",
                "3. Documentar la llamada."
            ]

        # REGLA 4: Incertidumbre acústica o sospecha moderada
        elif aasist.verdict == "Resultado indeterminado" or not verified_identity:
            operational_level = "MEDIO"
            applied_rule = "REGLA-04: Incertidumbre acústica y canal no autenticado."
            operational_recommendation = (
                "PROCEDER CON PRECAUCIÓN. No se observan alertas críticas inmediatas, pero el canal carece de "
                "verificación robusta."
            )
            action_protocol = [
                "1. Evitar compartir información confidencial no pública.",
                "2. Requerir envío de correo corporativo firmado o ticket antes de actuar."
            ]

        # REGLA 5: Comunicación legítima y verificada
        else:
            operational_level = "BAJO"
            applied_rule = "REGLA-05: Parámetros dentro del perfil de comunicación ordinaria verificada."
            operational_recommendation = (
                "RIESGO BAJO EVALUADO. Parámetros normales y sin indicios de manipulación maliciosa ni síntesis."
            )
            action_protocol = [
                "1. Continuar el procedimiento habitual conforme a las políticas de seguridad de la organización."
            ]

        scientific_disclaimer = (
            "Este resultado es una recomendación operacional defensiva basada en la combinación heurística "
            "y de modelos de 4 dimensiones. No constituye una certeza matemática ni reemplaza el criterio "
            "del analista de ciberseguridad."
        )

        response = MultilayerRiskAssessmentResponse(
            audio_id=audio_id,
            dimensions=dimensions,
            social_analysis=social_analysis,
            verified_identity=verified_identity,
            sensitive_request_detected=sensitive_request,
            operational_risk_level=operational_level,
            operational_recommendation=operational_recommendation,
            action_protocol=action_protocol,
            applied_rule=applied_rule,
            scientific_disclaimer=scientific_disclaimer
        )

        # Guardar en base de datos
        save_analysis_record(
            analysis_id=f"risk_{audio_id}",
            audio_id=audio_id,
            acoustic_score=aasist.raw_score,
            acoustic_verdict=aasist.verdict,
            watermark_status=wm.status,
            transcript=social_analysis.transcript,
            social_engineering_score=sem_score,
            risk_level=operational_level,
            verified_identity=verified_identity,
            operational_recommendation=operational_recommendation,
            details=response.model_dump()
        )

        return response

risk_assessment_service = RiskAssessmentService()
