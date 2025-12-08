"""
Rotas para gerenciamento de casos
"""
from fastapi import APIRouter, HTTPException

from ..repositories import CaseRepository

router = APIRouter(prefix="/api/relatos", tags=["Casos"])


@router.get("")
def listar_relatos(limit: int = 50):
    """
    Lista os relatos mais recentes

    - **limit**: Número máximo de relatos a retornar (padrão: 50)
    """
    try:
        # Inicializar repositório
        repository = CaseRepository()

        casos = repository.find_all(limit=limit)
        return {
            "total": len(casos),
            "casos": casos
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar relatos: {str(e)}")


@router.get("/{case_id}")
def buscar_relato(case_id: int):
    """
    Busca um relato específico pelo ID

    - **case_id**: ID do caso
    """
    # Inicializar repositório
    repository = CaseRepository()

    caso = repository.find_by_id(case_id)

    if not caso:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    return caso
