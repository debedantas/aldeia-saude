"""
Repository para gerenciamento de casos usando SQLAlchemy
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from ..database.models import Case
from ..database.session import get_db_session


class CaseRepository:
    """Repository pattern para acesso aos dados de casos"""

    def __init__(self, session: Optional[Session] = None):
        """
        Inicializa o repositório

        Args:
            session: Sessão SQLAlchemy (opcional). Se não fornecida, usa context manager interno.
        """
        self._session = session
        self._owns_session = session is None

    def _get_session(self):
        """Retorna a sessão a ser usada"""
        if self._session:
            return self._session
        # Se não temos uma sessão, usamos o context manager
        return get_db_session()

    def create(
        self,
        relato_original: str,
        tipo_entrada: str,
        audio_path: Optional[str] = None
    ) -> int:
        """
        Cria um novo caso no banco de dados

        Args:
            relato_original: Texto do relato (transcrição ou texto direto)
            tipo_entrada: Tipo de entrada ('texto' ou 'audio')
            audio_path: Caminho do arquivo de áudio (opcional)

        Returns:
            ID do caso criado
        """
        case = Case(
            relato_original=relato_original,
            tipo_entrada=tipo_entrada,
            audio_path=audio_path
        )

        with self._get_session() as session:
            session.add(case)
            session.flush()
            return case.id

    def find_by_id(self, case_id: int) -> Optional[dict]:
        """
        Busca um caso pelo ID

        Args:
            case_id: ID do caso

        Returns:
            Dicionário com dados do caso ou None se não encontrado
        """
        with self._get_session() as session:
            case = session.query(Case).filter(Case.id == case_id).first()
            return case.to_dict() if case else None

    def find_all(self, limit: int = 50) -> List[dict]:
        """
        Lista os casos mais recentes

        Args:
            limit: Número máximo de casos a retornar

        Returns:
            Lista de dicionários com dados dos casos
        """
        with self._get_session() as session:
            cases = session.query(Case).order_by(
                Case.created_at.desc()).limit(limit).all()
            return [case.to_dict() for case in cases]

    def delete(self, case_id: int) -> bool:
        """
        Deleta um caso pelo ID

        Args:
            case_id: ID do caso

        Returns:
            True se deletado com sucesso, False se não encontrado
        """
        with self._get_session() as session:
            case = session.query(Case).filter(Case.id == case_id).first()
            if case:
                session.delete(case)
                return True
            return False

    def update_status(
        self,
        case_id: int,
        status: str,
        error_message: Optional[str] = None
    ) -> bool:
        """
        Atualiza o status de um caso

        Args:
            case_id: ID do caso
            status: Novo status (pendente, processando, completo, erro)
            error_message: Mensagem de erro (opcional)

        Returns:
            True se atualizado com sucesso, False se não encontrado
        """
        with self._get_session() as session:
            case = session.query(Case).filter(Case.id == case_id).first()
            if case:
                case.status = status
                if error_message:
                    case.error_message = error_message
                return True
            return False
