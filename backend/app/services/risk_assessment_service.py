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
        # Dimensión A: Clasificación acústica exploratoria.
        # La señal describe el audio; no determina si la comunicación es maliciosa.
        # ---------------------------------------------
        aasist = acoustic_analysis.acoustic_detection
        if aasist.verdict == "Indicadores compatibles con síntesis":
            dim_a_summary = f"El detector experimental observa rasgos compatibles con síntesis (score: {aasist.raw_score:+.3f})"
        elif aasist.verdict == "Indicadores compatibles con voz humana":
            dim_a_summary = f"El detector experimental observa rasgos compatibles con voz humana (score: {aasist.raw_score:+.3f})"
        else:
            dim_a_summary = f"El detector no separa el audio con claridad (score: {aasist.raw_score:+.3f})"

        dimensions.append(DimensionEvidence(
            dimension_code="A_acustica",
            dimension_name="Detector Acústico Experimental",
            indicator_summary=dim_a_summary,
            risk_contribution="neutro",
            technical_detail=f"{aasist.engine_used}. {aasist.technical_interpretation}"
        ))

        # ---------------------------------------------
        # Dimensión B: Evidencia de Procedencia (PerTh)
        # ---------------------------------------------
        wm = acoustic_analysis.watermark_detection
        if wm.detected:
            dim_b_summary = f"Firma compatible con la marca configurada detectada (score: {wm.correlation_score:.2f})"
        else:
            dim_b_summary = "No se encontró la firma consultada; esto no demuestra origen humano"

        dimensions.append(DimensionEvidence(
            dimension_code="B_procedencia",
            dimension_name=f"Marca de procedencia ({wm.method_name})",
            indicator_summary=dim_b_summary,
            risk_contribution="neutro",
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
            dimension_name=f"Análisis de Ingeniería Social ({social_analysis.analyzer_engine})",
            indicator_summary=dim_c_summary,
            risk_contribution=dim_c_risk,
            technical_detail=social_analysis.summary
        ))

        # ---------------------------------------------
        # Dimensión D: Verificación Independiente de Identidad
        # ---------------------------------------------
        if verified_identity:
            dim_d_risk = "bajo"
            dim_d_summary = "El operador registró que verificó identidad por un canal independiente"
        else:
            dim_d_risk = "alto" if sensitive_request else "medio"
            dim_d_summary = "El operador no registró una verificación independiente de identidad"

        dimensions.append(DimensionEvidence(
            dimension_code="D_verificacion_identidad",
            dimension_name="Verificación Fuera de Banda (Out-of-Band)",
            indicator_summary=dim_d_summary,
            risk_contribution=dim_d_risk,
            technical_detail=(
                "Es una declaración manual de la sesión; el laboratorio no realiza ni comprueba la llamada inversa. "
                "La organización debe usar un número registrado o un procedimiento preacordado."
            )
        ))

        # ---------------------------------------------
        # Reglas de Decisión Operativa
        # ---------------------------------------------
        action_protocol: List[str] = []
        applied_rule: str = ""

        # Regla 1: la acción sensible requiere el flujo formal, con independencia del tipo de voz.
        if sensitive_request:
            operational_level = "ALTO"
            applied_rule = "REGLA DE ORO (REGLA-01): solicitud sensible; aplicar el procedimiento formal."
            operational_recommendation = (
                "DETENER LA ACCIÓN. No compartir códigos, contraseñas o tokens ni autorizar una transferencia durante la llamada. "
                "Detener la acción y continuar por el canal institucional aprobado; la clasificación de voz no cambia este criterio."
            )
            action_protocol = [
                "1. No dictar códigos OTP, contraseñas, claves ni tokens por teléfono.",
                "2. No ejecutar pagos o transferencias por una instrucción recibida en la llamada.",
                "3. Cerrar la comunicación y contactar al supuesto emisor por un número oficial ya registrado.",
                "4. Completar la operación únicamente mediante el flujo formal de autorización de la organización."
            ]

        # Regla 2: riesgo elevado estimado a partir del contenido de la transcripción.
        elif sem_score >= 60.0:
            operational_level = "ALTO"
            applied_rule = "REGLA-02: Indicadores semánticos elevados; revisar transcripción y contexto."
            operational_recommendation = (
                "La transcripción presenta varios indicadores de posible ingeniería social. Revisá el texto y el contexto antes de actuar."
            )
            action_protocol = [
                "1. Pausar cualquier decisión solicitada durante la llamada.",
                "2. Corroborar el pedido con el área responsable mediante un canal conocido.",
                "3. Reportar el intento según el procedimiento interno."
            ]

        # Regla 3: la falta de verificación y la incertidumbre piden cautela, no una atribución.
        elif aasist.verdict == "Resultado indeterminado" or not verified_identity:
            operational_level = "MEDIO"
            applied_rule = "REGLA-03: Canal sin verificación registrada o evidencia acústica indeterminada."
            operational_recommendation = (
                "La sesión no registra una verificación independiente o el detector acústico quedó indeterminado. "
                "No tomes el resultado como autenticación del hablante."
            )
            action_protocol = [
                "1. Evitar compartir información confidencial o ejecutar cambios durante la llamada.",
                "2. Confirmar el pedido en el directorio o sistema institucional ya conocido."
            ]

        # Regla 4: ausencia de alertas en este análisis no prueba legitimidad.
        else:
            operational_level = "BAJO"
            applied_rule = "REGLA-04: No se activaron criterios de cautela en esta evaluación."
            operational_recommendation = (
                "No se activaron criterios de cautela con los datos analizados. Este resultado no demuestra legitimidad ni identidad."
            )
            action_protocol = [
                "1. Continuar solo por los procedimientos habituales de la organización.",
                "2. Tratar cualquier evidencia de síntesis como una característica de la voz, no como prueba de fraude."
            ]

        scientific_disclaimer = (
            "Evaluación exploratoria basada en señales acústicas, marca consultada, transcripción y una casilla "
            "de verificación declarada por el operador. Las señales de voz no determinan intención o identidad; "
            "los scores no están calibrados y el sistema no realiza la verificación fuera de banda."
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
