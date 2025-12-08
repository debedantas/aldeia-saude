"""
SQLAlchemy models for database tables
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Case(Base):
    """Model para tabela de casos/relatos"""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    relato_original = Column(Text, nullable=False)
    tipo_entrada = Column(String(10), nullable=False)
    audio_path = Column(Text, nullable=True)
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
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class StructuredData(Base):
    """Model para dados estruturados extraídos dos relatos"""
    __tablename__ = "structured_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    sintomas_ptbr = Column(Text, nullable=True)
    termos_indigenas = Column(Text, nullable=True)
    categoria_sintoma = Column(String(100), nullable=True)
    idade_paciente = Column(String(50), nullable=True)
    duracao_sintomas = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento
    case = relationship("Case", back_populates="structured_data")

    def to_dict(self):
        """Converte o modelo para dicionário"""
        return {
            "id": self.id,
            "case_id": self.case_id,
            "sintomas_ptbr": self.sintomas_ptbr,
            "termos_indigenas": self.termos_indigenas,
            "categoria_sintoma": self.categoria_sintoma,
            "idade_paciente": self.idade_paciente,
            "duracao_sintomas": self.duracao_sintomas,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class MedicalExplanation(Base):
    """Model para explicações médicas geradas"""
    __tablename__ = "medical_explanations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    explicacao = Column(Text, nullable=True)
    gravidade_sugerida = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento
    case = relationship("Case", back_populates="medical_explanations")

    def to_dict(self):
        """Converte o modelo para dicionário"""
        return {
            "id": self.id,
            "case_id": self.case_id,
            "explicacao": self.explicacao,
            "gravidade_sugerida": self.gravidade_sugerida,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
