"""
Rotas para gerenciamento de casos
"""
from fastapi import APIRouter, HTTPException

from ..repositories import CaseRepository, StructuredDataRepository
from ..schemas.case import CaseUpdateRequest
from ..schemas.structured_data import StructuredDataUpdateRequest

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

    Retorna o caso com status:
    - "pendente": estruturação em andamento
    - "processando": em processamento
    - "completo": dados estruturados disponíveis
    - "erro": falha na estruturação
    """
    # Inicializar repositórios
    case_repo = CaseRepository()
    structured_repo = StructuredDataRepository()

    caso = case_repo.find_by_id(case_id)

    if not caso:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Buscar dados estruturados se disponíveis
    structured_data = None
    if caso.get("status") == "completo":
        structured_data = structured_repo.find_by_case_id(case_id)

    return {
        **caso,
        "structured_data": structured_data
    }


@router.put("/{case_id}")
def atualizar_relato(case_id: int, update_data: CaseUpdateRequest):
    """
    Atualiza um relato existente

    - **case_id**: ID do caso
    - **relato_original**: Novo texto do relato (opcional)
    - **status**: Novo status (opcional)

    Status possíveis:
    - "pendente": estruturação em andamento
    - "processando": em processamento
    - "completo": dados estruturados disponíveis
    - "erro": falha na estruturação
    """
    case_repo = CaseRepository()

    # Verificar se o caso existe
    caso_existente = case_repo.find_by_id(case_id)
    if not caso_existente:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Atualizar o caso
    caso_atualizado = case_repo.update(
        case_id=case_id,
        relato_original=update_data.relato_original,
        status=update_data.status
    )

    if not caso_atualizado:
        raise HTTPException(
            status_code=500, detail="Erro ao atualizar o caso")

    return {
        "message": "Caso atualizado com sucesso",
        "caso": caso_atualizado
    }


@router.delete("/{case_id}")
def deletar_relato(case_id: int):
    """
    Deleta um relato existente

    - **case_id**: ID do caso

    Remove o caso e todos os dados associados (dados estruturados, explicações médicas, etc.)
    """
    case_repo = CaseRepository()

    # Verificar se o caso existe
    caso_existente = case_repo.find_by_id(case_id)
    if not caso_existente:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Deletar o caso
    sucesso = case_repo.delete(case_id)

    if not sucesso:
        raise HTTPException(status_code=500, detail="Erro ao deletar o caso")

    return {
        "message": "Caso deletado com sucesso",
        "case_id": case_id
    }


@router.put("/{case_id}/structured-data")
def atualizar_dados_estruturados(case_id: int, update_data: StructuredDataUpdateRequest):
    """
    Atualiza os dados estruturados de um caso

    - **case_id**: ID do caso
    - Campos opcionais para atualização dos dados estruturados
    """
    case_repo = CaseRepository()
    structured_repo = StructuredDataRepository()

    # Verificar se o caso existe
    caso_existente = case_repo.find_by_id(case_id)
    if not caso_existente:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Verificar se existem dados estruturados para este caso
    dados_existentes = structured_repo.find_by_case_id(case_id)
    if not dados_existentes:
        raise HTTPException(
            status_code=404, 
            detail="Dados estruturados não encontrados para este caso"
        )

    # Atualizar os dados estruturados
    dados_atualizados = structured_repo.update(
        case_id=case_id,
        paciente_nome=update_data.paciente_nome,
        paciente_sexo=update_data.paciente_sexo,
        sintomas_identificados_ptbr=update_data.sintomas_identificados_ptbr,
        correspondencia_indigena=update_data.correspondencia_indigena,
        categoria_sintoma=update_data.categoria_sintoma,
        idade_paciente=update_data.idade_paciente,
        duracao_sintomas=update_data.duracao_sintomas,
        fator_desencadeante=update_data.fator_desencadeante,
        temperatura_graus=update_data.temperatura_graus,
        pressao_arterial=update_data.pressao_arterial
    )

    if not dados_atualizados:
        raise HTTPException(
            status_code=500, 
            detail="Erro ao atualizar dados estruturados"
        )

    return {
        "message": "Dados estruturados atualizados com sucesso",
        "structured_data": dados_atualizados
    }
