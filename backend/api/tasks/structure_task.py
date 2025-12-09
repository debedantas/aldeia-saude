"""
Task de background para estruturação de dados
"""
import logging
from typing import Optional

from ..repositories import CaseRepository, StructuredDataRepository
from ..services.structure_service import StructureService

logger = logging.getLogger(__name__)


async def structure_case_task(case_id: int):
    """
    Processa estruturação de dados para um caso em background

    Args:
        case_id: ID do caso a ser processado
    """
    case_repo = CaseRepository()
    structured_repo = StructuredDataRepository()

    try:
        # Buscar caso
        case = case_repo.find_by_id(case_id)
        if not case:
            logger.error(f"Caso {case_id} não encontrado")
            return

        # Atualizar status para processando
        case_repo.update_status(case_id, "processando")

        # Inicializar serviço de estruturação
        structure_service = StructureService()

        # Processar relato
        structured_data = structure_service.processar_relato(
            case["relato_original"])

        # Salvar dados estruturados
        structured_repo.create(
            case_id=case_id,
            paciente_nome=structured_data.get("paciente_nome"),
            paciente_sexo=structured_data.get("paciente_sexo"),
            sintomas_identificados_ptbr=structured_data.get("sintomas_identificados_ptbr"),
            correspondencia_indigena=structured_data.get("correspondencia_indigena"),
            categoria_sintoma=structured_data.get("categoria_sintoma"),
            idade_paciente=structured_data.get("idade_paciente"),
            duracao_sintomas=structured_data.get("duracao_sintomas"),
            fator_desencadeante=structured_data.get("fator_desencadeante"),
            temperatura_graus=structured_data.get("temperatura_graus"),
            pressao_arterial=structured_data.get("pressao_arterial")
        )

        # Atualizar status para completo
        case_repo.update_status(case_id, "completo")

        logger.info(f"Caso {case_id} estruturado com sucesso")

    except Exception as e:
        error_msg = f"Erro ao estruturar caso {case_id}: {str(e)}"
        logger.error(error_msg)

        # Atualizar status para erro
        case_repo.update_status(case_id, "erro", error_message=str(e))
