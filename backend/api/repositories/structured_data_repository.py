"""
Repository para dados estruturados
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from ..database.models import StructuredData
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
        sintomas_ptbr: Optional[str] = None,
        termos_indigenas: Optional[str] = None,
        categoria_sintoma: Optional[str] = None,
        idade_paciente: Optional[str] = None,
        duracao_sintomas: Optional[str] = None
    ) -> int:
        """Cria um novo registro de dados estruturados"""
        data = StructuredData(
            case_id=case_id,
            sintomas_ptbr=sintomas_ptbr,
            termos_indigenas=termos_indigenas,
            categoria_sintoma=categoria_sintoma,
            idade_paciente=idade_paciente,
            duracao_sintomas=duracao_sintomas
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
