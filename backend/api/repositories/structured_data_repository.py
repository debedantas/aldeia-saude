"""
Repository para dados estruturados
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from ..database.models import StructuredData, SexoEnum
from ..database.session import get_db_session


class StructuredDataRepository:
    """Repository para acesso aos dados estruturados"""

    def __init__(self, session: Optional[Session] = None):
        self._session = session

    def _get_session(self):
        """Retorna a sessão a ser usada"""
        if self._session:
            return self._session
        return get_db_session()

    def create(
        self,
        case_id: int,
        paciente_nome: Optional[str] = None,
        paciente_sexo: Optional[str] = None,
        sintomas_identificados_ptbr: Optional[str] = None,
        correspondencia_indigena: Optional[str] = None,
        categoria_sintoma: Optional[str] = None,
        idade_paciente: Optional[str] = None,
        duracao_sintomas: Optional[str] = None,
        fator_desencadeante: Optional[str] = None,
        temperatura_graus: Optional[float] = None,
        pressao_arterial: Optional[str] = None
    ) -> int:
        """Cria um novo registro de dados estruturados"""
        data = StructuredData(
            case_id=case_id,
            paciente_nome=paciente_nome,
            paciente_sexo=paciente_sexo,
            sintomas_identificados_ptbr=sintomas_identificados_ptbr,
            correspondencia_indigena=correspondencia_indigena,
            categoria_sintoma=categoria_sintoma,
            idade_paciente=idade_paciente,
            duracao_sintomas=duracao_sintomas,
            fator_desencadeante=fator_desencadeante,
            temperatura_graus=temperatura_graus,
            pressao_arterial=pressao_arterial
        )

        with self._get_session() as session:
            session.add(data)
            session.flush()
            return data.id

    def find_by_case_id(self, case_id: int) -> Optional[dict]:
        """Busca dados estruturados por ID do caso"""
        with self._get_session() as session:
            data = session.query(StructuredData).filter(
                StructuredData.case_id == case_id
            ).first()
            return data.to_dict() if data else None

    def find_all(self, limit: int = 50) -> List[dict]:
        """Lista todos os dados estruturados"""
        with self._get_session() as session:
            data_list = session.query(StructuredData).order_by(
                StructuredData.created_at.desc()
            ).limit(limit).all()
            return [data.to_dict() for data in data_list]

    def update(
        self,
        case_id: int,
        paciente_nome: Optional[str] = None,
        paciente_sexo: Optional[str] = None,
        sintomas_identificados_ptbr: Optional[str] = None,
        correspondencia_indigena: Optional[str] = None,
        categoria_sintoma: Optional[str] = None,
        idade_paciente: Optional[str] = None,
        duracao_sintomas: Optional[str] = None,
        fator_desencadeante: Optional[str] = None,
        temperatura_graus: Optional[float] = None,
        pressao_arterial: Optional[str] = None
    ) -> Optional[dict]:
        """
        Atualiza dados estruturados de um caso

        Args:
            case_id: ID do caso
            Demais parâmetros opcionais para atualização

        Returns:
            Dicionário com dados atualizados ou None se não encontrado
        """
        with self._get_session() as session:
            data = session.query(StructuredData).filter(
                StructuredData.case_id == case_id
            ).first()
            
            if not data:
                return None
            
            # Update only provided fields
            if paciente_nome is not None:
                data.paciente_nome = paciente_nome
            if paciente_sexo is not None:
                # Ensure proper enum assignment
                try:
                    data.paciente_sexo = paciente_sexo if isinstance(paciente_sexo, SexoEnum) else SexoEnum(paciente_sexo)
                except ValueError:
                    # fallback to INDEFINIDO if invalid value
                    data.paciente_sexo = SexoEnum.INDEFINIDO
            if sintomas_identificados_ptbr is not None:
                data.sintomas_identificados_ptbr = sintomas_identificados_ptbr
            if correspondencia_indigena is not None:
                data.correspondencia_indigena = correspondencia_indigena
            if categoria_sintoma is not None:
                data.categoria_sintoma = categoria_sintoma
            if idade_paciente is not None:
                data.idade_paciente = idade_paciente
            if duracao_sintomas is not None:
                data.duracao_sintomas = duracao_sintomas
            if fator_desencadeante is not None:
                data.fator_desencadeante = fator_desencadeante
            if temperatura_graus is not None:
                data.temperatura_graus = temperatura_graus
            if pressao_arterial is not None:
                data.pressao_arterial = pressao_arterial
            
            session.flush()
            return data.to_dict()
