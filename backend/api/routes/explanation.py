"""
Rota para geração de explicações médicas
"""
from fastapi import APIRouter, HTTPException

from ..repositories import CaseRepository
from ..repositories.structured_data_repository import StructuredDataRepository
from ..repositories.medical_explanation_repository import MedicalExplanationRepository
from ..services.explanation_service import ExplanationService

router = APIRouter(prefix="/api/relatos", tags=["Explicações"])


@router.post("/{case_id}/explicar")
def gerar_explicacao_medica(case_id: int):
    """
    Gera explicação médica para um caso com dados estruturados

    - **case_id**: ID do caso a ser explicado
    
    Retorna narrativa clínica (SOAP), gravidade sugerida e recomendações
    """
    try:
        # Buscar caso
        case_repo = CaseRepository()
        case = case_repo.find_by_id(case_id)
        
        if not case:
            raise HTTPException(status_code=404, detail="Caso não encontrado")
        
        # Verificar se já tem dados estruturados
        structured_repo = StructuredDataRepository()
        structured_data = structured_repo.find_by_case_id(case_id)
        
        if not structured_data:
            raise HTTPException(
                status_code=400, 
                detail="Caso ainda não possui dados estruturados. Aguarde o processamento."
            )
        
        # Verificar se já tem explicação
        explanation_repo = MedicalExplanationRepository()
        existing_explanation = explanation_repo.find_by_case_id(case_id)
        
        if existing_explanation:
            return {
                "message": "Explicação já existe para este caso",
                "explanation": existing_explanation
            }
        
        # Gerar explicação
        explanation_service = ExplanationService()
        resultado = explanation_service.gerar_explicacao(structured_data)
        
        # Salvar no banco
        explanation_id = explanation_repo.create(
            case_id=case_id,
            narrativa_clinica=resultado["narrativa_clinica"],
            gravidade_sugerida=resultado["gravidade_sugerida"],
            justificativa_gravidade=resultado["justificativa_gravidade"],
            recomendacoes=resultado["recomendacoes"]
        )
        
        # Buscar explicação criada
        explanation = explanation_repo.find_by_case_id(case_id)
        
        return {
            "message": "Explicação médica gerada com sucesso",
            "explanation": explanation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar explicação: {str(e)}"
        )
