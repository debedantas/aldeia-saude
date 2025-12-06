# Mini RAG - Sistema de Saúde Indígena Yanomami

Sistema de Retrieval-Augmented Generation (RAG) para processar relatos de saúde e enriquecê-los com vocabulário indígena Yanomami, utilizando Google Gemini, LangChain e FAISS.

## 📋 Descrição

Este MVP processa relatos informais de sintomas e os estrutura em JSON, correlacionando termos em português com vocabulário indígena específico extraído de um documento de referência (`Saude_Yanomami.pdf`).

### Funcionalidades

- ✅ Carregamento e processamento de PDF com conhecimento base
- ✅ Vetorização e indexação usando FAISS
- ✅ Busca semântica de termos indígenas relacionados aos sintomas
- ✅ Geração de output estruturado em JSON via Google Gemini
- ✅ Modo interativo para processamento de múltiplos relatos
- ✅ Cache do índice FAISS para melhor performance

## 🚀 Instalação

### 1. Pré-requisitos

- Python 3.8 ou superior
- Conta Google Cloud com API Gemini ativada

### 2. Clone e Configuração

```powershell
# Navegue até o diretório do projeto
cd "c:\Users\danta\Documents\Déborah_2025_2\TOPICOS IA\aldeia-saude"

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
.\venv\Scripts\Activate.ps1

# Instale as dependências
pip install -r requirements.txt
```

### 3. Configuração da API Key

1. Obtenha sua API Key do Google Gemini em: https://makersuite.google.com/app/apikey

2. Crie um arquivo `.env` na raiz do projeto:

```powershell
# Copie o template
cp .env.example .env
```

3. Edite o arquivo `.env` e adicione sua chave:

```env
GOOGLE_API_KEY=sua_api_key_aqui
```

### 4. Adicione o PDF

Coloque o arquivo `Saude_Yanomami.pdf` na raiz do projeto.

## 💻 Uso

### Modo Completo (Exemplo + Interativo)

```powershell
python main.py
```

O sistema irá:

1. Carregar e processar o PDF (primeira execução)
2. Criar índice FAISS
3. Executar um exemplo demonstrativo
4. Entrar em modo interativo para novos relatos

### Uso Programático

```python
from main import MiniRAGSaudeIndigena

# Inicializar
rag = MiniRAGSaudeIndigena("Saude_Yanomami.pdf")
rag.setup()

# Processar relato
relato = "Estou com febre alta e dor de cabeça há 2 dias"
resultado = rag.processar_relato(relato)

# Resultado é um dicionário Python
print(resultado)
```

## 📊 Formato de Saída

O sistema retorna um JSON com a seguinte estrutura:

```json
{
  "relato_original": "texto completo do relato do usuário",
  "sintomas_identificados_ptbr": ["dor de cabeça", "febre", "tosse"],
  "correspondencia_indigena": [
    {
      "termo_nativo": "termo em yanomami encontrado no PDF",
      "significado_aproximado": "tradução ou significado",
      "contexto_cultural_saude": "explicação baseada no conhecimento do PDF"
    }
  ],
  "categoria_sintoma": "categoria geral (ex: respiratório, febril)"
}
```

## 🛠️ Tecnologias Utilizadas

- **Python 3.8+**: Linguagem base
- **LangChain**: Orquestração do RAG
- **Google Gemini (gemini-pro)**: Large Language Model
- **FAISS**: Vector store para busca semântica
- **PyPDF**: Parser de documentos PDF
- **python-dotenv**: Gerenciamento de variáveis de ambiente

## 📁 Estrutura do Projeto

```
aldeia-saude/
│
├── main.py                 # Código principal do sistema
├── requirements.txt        # Dependências Python
├── .env.example           # Template de configuração
├── .env                   # Suas configurações (não versionado)
├── Saude_Yanomami.pdf     # Documento de referência (adicionar)
├── faiss_index/           # Índice vetorial (gerado automaticamente)
└── README_MINI_RAG.md     # Este arquivo
```

## ⚙️ Configurações Avançadas

### Ajustar Tamanho dos Chunks

No arquivo `main.py`, linha 55-60:

```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,        # Tamanho de cada chunk
    chunk_overlap=200,      # Sobreposição entre chunks
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]
)
```

### Alterar Número de Documentos Recuperados

No arquivo `main.py`, linha 122:

```python
search_kwargs={"k": 5}  # Altere o valor de k
```

### Ajustar Temperatura do LLM

No arquivo `main.py`, linha 34:

```python
temperature=0.3  # Valores: 0.0 (determinístico) a 1.0 (criativo)
```

## 🐛 Troubleshooting

### Erro: "GOOGLE_API_KEY não encontrada"

- Verifique se o arquivo `.env` existe e contém a chave correta

### Erro: "Arquivo Saude_Yanomami.pdf não encontrado"

- Certifique-se de que o PDF está na raiz do projeto

### JSON inválido no output

- O sistema possui fallback automático que retorna a resposta bruta em caso de erro de parsing

## 📝 Notas

- Na primeira execução, o sistema demora alguns segundos para processar o PDF e criar o índice
- Execuções subsequentes são mais rápidas pois o índice FAISS é reutilizado
- O índice fica salvo na pasta `faiss_index/`

## 📄 Licença

Este projeto foi desenvolvido como MVP educacional.

---

**Desenvolvido por**: Déborah Dantas  
**Data**: Dezembro 2025
