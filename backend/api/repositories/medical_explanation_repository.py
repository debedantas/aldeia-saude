"""
Repository para explicações médicas
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from ..database.models import MedicalExplanation
from ..database.session import get_db_session


class MedicalExplanationRepository:
    """Repository para acesso às explicações médicas"""

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
        narrativa_clinica: str,
        gravidade_sugerida: str,
        justificativa_gravidade: str,
        recomendacoes: str
    ) -> int:
        """Cria uma nova explicação médica"""
        explanation = MedicalExplanation(
            case_id=case_id,
            narrativa_clinica=narrativa_clinica,
            gravidade_sugerida=gravidade_sugerida,
            justificativa_gravidade=justificativa_gravidade,
            recomendacoes=recomendacoes
        )

        with self._get_session() as session:
            session.add(explanation)
            session.flush()
            return explanation.id

    def find_by_case_id(self, case_id: int) -> Optional[dict]:
        """Busca explicação médica por ID do caso"""
        with self._get_session() as session:
            explanation = session.query(MedicalExplanation).filter(
                MedicalExplanation.case_id == case_id
            ).first()
            return explanation.to_dict() if explanation else None

    def find_all(self, limit: int = 50) -> List[dict]:
        """Lista todas as explicações médicas"""
        with self._get_session() as session:
            explanations = session.query(MedicalExplanation).order_by(
                MedicalExplanation.created_at.desc()
            ).limit(limit).all()
            return [exp.to_dict() for exp in explanations]
