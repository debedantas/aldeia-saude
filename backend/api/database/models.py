"""
SQLAlchemy models for database tables
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, Float, Enum as SQLEnum
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()


class SexoEnum(str, enum.Enum):
    """Enum para sexo do paciente"""
    MASCULINO = "M"
    FEMININO = "F"
    INDEFINIDO = "Indefinido"


class Case(Base):
    """Model para tabela de casos/relatos"""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    relato_original = Column(Text, nullable=False)
    tipo_entrada = Column(String(10), nullable=False)
    audio_path = Column(Text, nullable=True)
    status = Column(String(20), default="pendente", nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    structured_data = relationship(
        "StructuredData", back_populates="case", cascade="all, delete-orphan")
    medical_explanations = relationship(
        "MedicalExplanation", back_populates="case", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("tipo_entrada IN ('texto', 'audio')",
                        name="check_tipo_entrada"),
    )

    def to_dict(self):
        """Converte o modelo para dicionário"""
        return {
            "id": self.id,
            "relato_original": self.relato_original,
            "tipo_entrada": self.tipo_entrada,
            "audio_path": self.audio_path,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class StructuredData(Base):
    """Model para dados estruturados extraídos dos relatos"""
    __tablename__ = "structured_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)

    # Dados do paciente
    paciente_nome = Column(String(200), nullable=True)
    paciente_sexo = Column(
        SQLEnum(SexoEnum), default=SexoEnum.INDEFINIDO, nullable=False)

    # Sintomas e termos
    # JSON array de sintomas normalizados
    sintomas_identificados_ptbr = Column(Text, nullable=True)
    # JSON array de termos indígenas
    correspondencia_indigena = Column(Text, nullable=True)
    categoria_sintoma = Column(String(100), nullable=True)

    # Dados clínicos
    # Mantido para compatibilidade (ex: "45 anos", "criança")
    idade_paciente = Column(String(50), nullable=True)
    duracao_sintomas = Column(String(100), nullable=True)
    fator_desencadeante = Column(Text, nullable=True)
    temperatura_graus = Column(Float, nullable=True)
    pressao_arterial = Column(String(20), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento
    case = relationship("Case", back_populates="structured_data")

    def to_dict(self):
        """Converte o modelo para dicionário"""
        return {
            "id": self.id,
            "case_id": self.case_id,
            "paciente_nome": self.paciente_nome,
            "paciente_sexo": self.paciente_sexo.value if self.paciente_sexo else None,
            "sintomas_identificados_ptbr": self.sintomas_identificados_ptbr,
            "correspondencia_indigena": self.correspondencia_indigena,
            "categoria_sintoma": self.categoria_sintoma,
            "idade_paciente": self.idade_paciente,
            "duracao_sintomas": self.duracao_sintomas,
            "fator_desencadeante": self.fator_desencadeante,
            "temperatura_graus": self.temperatura_graus,
            "pressao_arterial": self.pressao_arterial,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class MedicalExplanation(Base):
    """Model para explicações médicas geradas"""
    __tablename__ = "medical_explanations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    narrativa_clinica = Column(Text, nullable=True)
    gravidade_sugerida = Column(String(50), nullable=True)
    justificativa_gravidade = Column(Text, nullable=True)
    recomendacoes = Column(Text, nullable=True)  # JSON array
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento
    case = relationship("Case", back_populates="medical_explanations")

    def to_dict(self):
        """Converte o modelo para dicionário"""
        return {
            "id": self.id,
            "case_id": self.case_id,
            "narrativa_clinica": self.narrativa_clinica,
            "gravidade_sugerida": self.gravidade_sugerida,
            "justificativa_gravidade": self.justificativa_gravidade,
            "recomendacoes": self.recomendacoes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
