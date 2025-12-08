#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mini RAG - Sistema de Processamento de Relatos de Saúde com Vocabulário Indígena
Utiliza Google Gemini, LangChain e FAISS para retrieval-augmented generation
"""

import os
import json
import re
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# Carregar variáveis de ambiente
load_dotenv()


class MiniRAGSaudeIndigena:
    def __init__(self, pdf_path: str):
        """
        Inicializa o sistema Mini RAG

        Args:
            pdf_path: Caminho para o arquivo PDF com conhecimento base
        """
        self.pdf_path = pdf_path
        self.api_key = os.getenv("GOOGLE_API_KEY")

        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY não encontrada. Configure o arquivo .env")

        # Inicializar componentes
        print("🔄 Inicializando HuggingFace Embeddings (modelo local)...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0.3,
            convert_system_message_to_human=True
        )

        self.vector_store = None
        self.qa_chain = None

    def limpar_texto(self, texto: str) -> str:
        """Remove quebras de linha excessivas e limpa o texto"""
        # Remover múltiplas quebras de linha
        texto = re.sub(r'\n{3,}', '\n\n', texto)
        # Remover espaços antes de quebras de linha
        texto = re.sub(r' +\n', '\n', texto)
        # Remover quebras de linha isoladas (manter apenas parágrafos)
        texto = re.sub(r'(?<!\n)\n(?!\n)', ' ', texto)
        # Remover espaços múltiplos
        texto = re.sub(r' {2,}', ' ', texto)
        # Remover espaços no início e fim
        texto = texto.strip()
        return texto

    def carregar_e_processar_pdf(self):
        """Carrega o PDF e cria o vector store"""
        print("📄 Carregando PDF...")

        # Carregar PDF
        loader = PyPDFLoader(self.pdf_path)
        documentos = loader.load()

        print(f"✓ {len(documentos)} páginas carregadas")

        # Limpar texto de cada documento
        for doc in documentos:
            doc.page_content = self.limpar_texto(doc.page_content)

        # Dividir em chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=120,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        chunks = text_splitter.split_documents(documentos)
        print(f"✓ {len(chunks)} chunks criados")

        # Criar vector store com FAISS
        print("🔍 Criando índice FAISS...")
        self.vector_store = FAISS.from_documents(
            documents=chunks,
            embedding=self.embeddings
        )

        print("✓ Vector store criado com sucesso")

    def criar_chain(self):
        """Cria a cadeia de Retrieval QA"""

        # Template do prompt otimizado para output JSON
        prompt_template = """Você é um assistente especializado em saúde indígena Yanomami.

CONTEXTO DO CONHECIMENTO BASE:
{context}

RELATO DO USUÁRIO:
{question}

INSTRUÇÕES CRÍTICAS:
1. Analise o relato e identifique os sintomas mencionados
2. Busque no CONTEXTO termos indígenas relacionados aos sintomas
3. Retorne APENAS um JSON válido (sem markdown, sem ```json)
4. Use este schema exato:

{{
  "relato_original": "texto completo do relato",
  "sintomas_identificados_ptbr": ["sintoma1", "sintoma2"],
  "correspondencia_indigena": [
    {{
      "termo_nativo": "termo encontrado no contexto",
      "significado_aproximado": "tradução literal baseada no PDF/significado",
      "contexto_cultural_saude": "explicação baseada no PDF"
    }}
  ],
  "categoria_sintoma": "categoria geral do sintoma"
}}

IMPORTANTE: Retorne SOMENTE o JSON, sem texto adicional."""

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )

        # Criar chain
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

        print("✓ Chain criada")

    def processar_relato(self, relato: str) -> dict:
        """
        Processa um relato de sintomas e retorna JSON estruturado

        Args:
            relato: Texto livre descrevendo sintomas

        Returns:
            dict: JSON estruturado com análise do relato
        """
        if not self.qa_chain:
            raise RuntimeError(
                "Chain não inicializada. Execute setup() primeiro")

        print("\n🔄 Processando relato...")

        # Executar query
        resultado = self.qa_chain.invoke({"query": relato})

        # Extrair resposta
        resposta_texto = resultado["result"]

        # Tentar parsear JSON
        try:
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
            return resultado_json

        except json.JSONDecodeError as e:
            print(f"⚠️ Erro ao parsear JSON: {e}")
            print(f"Resposta original: {resposta_texto}")

            # Fallback: retornar estrutura mínima
            return {
                "relato_original": relato,
                "sintomas_identificados_ptbr": [],
                "correspondencia_indigena": [],
                "categoria_sintoma": "Não classificado",
                "erro": "Falha ao parsear resposta do LLM",
                "resposta_bruta": resposta_texto
            }

    def setup(self):
        """Executa todo o processo de setup"""
        self.carregar_e_processar_pdf()
        self.criar_chain()
        print("\n✅ Sistema pronto para uso!\n")

    def salvar_indice(self, caminho: str = "faiss_index"):
        """Salva o índice FAISS localmente para reutilização"""
        if self.vector_store:
            self.vector_store.save_local(caminho)
            print(f"✓ Índice salvo em {caminho}")

    def carregar_indice(self, caminho: str = "faiss_index"):
        """Carrega índice FAISS existente"""
        if os.path.exists(caminho):
            self.vector_store = FAISS.load_local(
                caminho,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            print(f"✓ Índice carregado de {caminho}")
            return True
        return False


def main():
    """Função principal - Exemplo de uso"""

    # Caminho para o PDF
    PDF_PATH = "saude_simplificado.pdf"

    # Verificar se PDF existe
    if not os.path.exists(PDF_PATH):
        print(f"❌ ERRO: Arquivo {PDF_PATH} não encontrado!")
        print("Por favor, coloque o arquivo saude_simplificado.pdf no diretório atual.")
        return

    # Inicializar sistema
    rag = MiniRAGSaudeIndigena(PDF_PATH)

    # Tentar carregar índice existente ou criar novo
    if not rag.carregar_indice():
        rag.setup()
        rag.salvar_indice()
    else:
        rag.criar_chain()
        print("\n✅ Sistema pronto (índice reutilizado)!\n")

    # Exemplo de relato
    relato_exemplo = """
    O paciente chegou muito agitado. Ao tocar nele, percebi que ele ya wakë tukema. 
    Ele aponta para o peito dizendo ya si huxi e mostra algumas marcas que parecem si wakë prakoko.
    """

    print("=" * 60)
    print("EXEMPLO DE USO")
    print("=" * 60)
    print(f"\nRelato: {relato_exemplo.strip()}\n")

    # Processar relato
    resultado = rag.processar_relato(relato_exemplo)

    # Exibir resultado formatado
    print("=" * 60)
    print("RESULTADO (JSON)")
    print("=" * 60)
    print(json.dumps(resultado, indent=2, ensure_ascii=False))

    print("\n" + "=" * 60)
    print("MODO INTERATIVO")
    print("=" * 60)
    print("Digite seus relatos de sintomas (ou 'sair' para encerrar)\n")

    # Loop interativo
    while True:
        relato_usuario = input("\n📝 Relato: ").strip()

        if relato_usuario.lower() in ['sair', 'exit', 'quit', '']:
            print("\n👋 Encerrando...")
            break

        resultado = rag.processar_relato(relato_usuario)
        print("\n📊 Resultado:")
        print(json.dumps(resultado, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
