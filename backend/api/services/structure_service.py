"""
Serviço de estruturação de dados usando RAG
"""
import os
import json
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
import re

load_dotenv()


class StructureService:
    """Serviço para estruturação de dados usando RAG"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY não encontrada no .env")

        # Inicializar embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        # Inicializar LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0.3,
            convert_system_message_to_human=True
        )

        # Carregar índice FAISS
        self.vector_store = None
        self.qa_chain = None

        # Carregar prompt
        self.prompt_template = self._carregar_prompt()

        self._carregar_indice()
        self._criar_chain()

        StructureService._initialized = True

    def _carregar_prompt(self) -> str:
        """Carrega o prompt de estruturação do arquivo"""
        prompt_path = Path(__file__).parent.parent.parent / \
            "prompts" / "structure_prompt.txt"
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()

    def _limpar_texto(self, texto: str) -> str:
        """Remove quebras de linha excessivas e limpa o texto"""
        texto = re.sub(r'\n{3,}', '\n\n', texto)
        texto = re.sub(r' +\n', '\n', texto)
        texto = re.sub(r'(?<!\n)\n(?!\n)', ' ', texto)
        texto = re.sub(r' {2,}', ' ', texto)
        return texto.strip()

    def _criar_indice_do_pdf(self, pdf_path: Path, indice_path: Path):
        """Cria índice FAISS a partir do saude_simplificado.pdf"""
        import tempfile
        import shutil

        # Carregar PDF da pasta data
        loader = PyPDFLoader(str(pdf_path))
        documentos = loader.load()

        # Limpar texto
        for doc in documentos:
            doc.page_content = self._limpar_texto(doc.page_content)

        # Dividir em chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=120,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        chunks = text_splitter.split_documents(documentos)

        # Criar vector store
        self.vector_store = FAISS.from_documents(
            documents=chunks,
            embedding=self.embeddings
        )

        # Salvar em diretório temporário primeiro
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_index = Path(temp_dir) / "faiss_temp"
            self.vector_store.save_local(str(temp_index))

            # Criar diretório de destino e copiar arquivos
            indice_path.mkdir(parents=True, exist_ok=True)
            shutil.copy2(temp_index / "index.faiss",
                         indice_path / "index.faiss")
            shutil.copy2(temp_index / "index.pkl", indice_path / "index.pkl")

        print(f"📁 Índice criado e salvo em: {indice_path}")

    def _carregar_indice(self):
        """Carrega ou cria índice FAISS"""
        indice_path = Path(__file__).parent.parent.parent / \
            "rag" / "faiss_index"
        pdf_path = Path(__file__).parent.parent.parent.parent / \
            "data" / "saude_simplificado.pdf"

        if not pdf_path.exists():
            raise RuntimeError(
                f"❌ ERRO: PDF não encontrado em {pdf_path}. "
                f"Adicione o arquivo 'saude_simplificado.pdf' na pasta data/."
            )

        # Sempre criar o índice do PDF
        print(f"🔄 Criando índice FAISS de {pdf_path}...")
        indice_path.mkdir(parents=True, exist_ok=True)
        self._criar_indice_do_pdf(pdf_path, indice_path)
        print(f"✅ Índice criado em {indice_path}")

    def _criar_chain(self):
        """Cria a cadeia de Retrieval QA"""

        PROMPT = PromptTemplate(
            template=self.prompt_template,
            input_variables=["context", "question"]
        )

        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 10}
            ),
            return_source_documents=False,
            chain_type_kwargs={"prompt": PROMPT}
        )

    def processar_relato(self, relato: str) -> dict:
        """
        Processa um relato e extrai dados estruturados

        Args:
            relato: Texto do relato

        Returns:
            dict: Dados estruturados extraídos
        """
        try:
            # Executar query
            resultado = self.qa_chain.invoke({"query": relato})
            resposta_texto = resultado["result"]

            # Limpar possível markdown
            resposta_limpa = resposta_texto.strip()
            if resposta_limpa.startswith("```json"):
                resposta_limpa = resposta_limpa[7:]
            if resposta_limpa.startswith("```"):
                resposta_limpa = resposta_limpa[3:]
            if resposta_limpa.endswith("```"):
                resposta_limpa = resposta_limpa[:-3]

            resposta_limpa = resposta_limpa.strip()

            # Parse JSON
            resultado_json = json.loads(resposta_limpa)

            # Serializar arrays como JSON strings para o banco
            sintomas_json = json.dumps(
                resultado_json.get("sintomas_identificados_ptbr", []),
                ensure_ascii=False
            )
            correspondencia_json = json.dumps(
                resultado_json.get("correspondencia_indigena", []),
                ensure_ascii=False
            )

            # Normalizar campos
            return {
                "paciente_nome": resultado_json.get("paciente_nome"),
                "paciente_sexo": resultado_json.get("paciente_sexo", "Indefinido"),
                "sintomas_identificados_ptbr": sintomas_json,
                "correspondencia_indigena": correspondencia_json,
                "categoria_sintoma": resultado_json.get("categoria_sintoma"),
                "idade_paciente": resultado_json.get("idade_paciente"),
                "duracao_sintomas": resultado_json.get("duracao_sintomas"),
                "fator_desencadeante": resultado_json.get("fator_desencadeante"),
                "temperatura_graus": resultado_json.get("temperatura_graus"),
                "pressao_arterial": resultado_json.get("pressao_arterial")
            }

        except Exception as e:
            raise RuntimeError(f"Erro ao processar relato: {str(e)}")
