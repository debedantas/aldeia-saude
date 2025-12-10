# AldeIA Saúde

Web app que usa RAG (Retrieval-Augmented Generation) para transformar relatos de saúde (áudio ou texto) com vocabulário indígena Yanomami em dados estruturados, gerando explicações médicas contextualizadas.

## Principais objetivos

- Processar relatos livres de saúde e extrair informações estruturadas utilizando Inteligência Artificial.
- Integrar vocabulário indígena Yanomami através de RAG para mapear termos nativos aos sintomas relatados.
- Gerar explicações médicas baseadas nos dados estruturados.
- Visualizar casos registrados em dashboard básico para monitoramento.

## Contribuições

- Reduz a dependência de registros médicos manuais e formulários, atacando erros, incompletudes e perda de informação em contextos remotos onde o AIS (Agente Indígena de Saúde) está sobrecarregado.
- Aproveita relatos livres (orais ou textuais) e aplica IA para transcrever e estruturar automaticamente os dados de saúde.
- Preserva e valoriza o vocabulário indígena Yanomami, mapeando termos nativos relacionados à saúde.
- Fornece explicações médicas contextualizadas baseadas nos sintomas identificados.
- Transforma relatos dispersos em informação útil e centrada na comunidade, produzindo análises que refletem a realidade da população indígena.
- Facilita o acompanhamento de casos através de dashboard visual, para fortalecer a visão do AIS.

## Visão Geral do MVP

### Fluxo Principal

1. **Ingestão de Dados** (`POST /api/relatos/texto` ou `/audio`)

   - Recebe relato em texto livre ou áudio
   - Áudio é transcrito usando Google Gemini com prompt enriquecido para vocabulário Yanomami
   - Relato original é salvo imediatamente no banco (SQLite com SQLAlchemy)
   - Sistema retorna `case_id` e `status: "pendente"`
   - **Background Task** inicia estruturação automaticamente

2. **Estruturação de Dados** (Background - Assíncrono)

   - Status atualizado para `"processando"`
   - LLM (Gemini 2.5 Flash) + RAG processam o relato e extraem:
     - **Dados do Paciente**: nome, idade (texto descritivo), sexo (M/F/Indefinido)
     - **Sintomas Identificados**: array de sintomas normalizados (ex: "quentura" → "Febre")
     - **Correspondência Indígena**: array de objetos `{termo_nativo, significado_aproximado, contexto_cultural_saude}`
     - **Categoria de Sintoma**: classificação geral (respiratório, febril, gastrointestinal, etc)
     - **Dados Clínicos**: duração, fator desencadeante, temperatura (°C), pressão arterial
   - RAG busca termos Yanomami em `saude_simplificado.pdf` usando FAISS
   - Dados estruturados salvos em `structured_data` table
   - Status atualizado para `"completo"` ou `"erro"`

3. **Geração de Explicações Médicas** (`POST /api/relatos/{id}/explicar`)

   - Busca dados estruturados do caso
   - Prompt contextualizado com cultura Yanomami gera:
     - **Narrativa Clínica**: Texto em formato SOAP (Subjetivo, Objetivo, Avaliação, Plano)
     - **Gravidade Sugerida**: Baixa/Média/Alta com regras claras de classificação
     - **Justificativa da Gravidade**: Explicação da classificação
     - **Recomendações**: Array de 3-5 ações práticas para agentes de saúde locais
   - Explicação salva em `medical_explanations` table vinculada ao caso

4. **Consulta de Casos**
   - `GET /api/relatos`: Lista todos os casos com status
   - `GET /api/relatos/{id}`: Detalhes do caso + dados estruturados (se `status: "completo"`)

### Arquitetura Técnica

- **Backend**: Python com FastAPI e SQLAlchemy
- **Banco de Dados**: SQLite com 3 tabelas principais:
  - `cases`: Relatos originais + status (pendente/processando/completo/erro)
  - `structured_data`: Dados extraídos (sintomas normalizados, termos indígenas, dados clínicos)
  - `medical_explanations`: Narrativas SOAP, gravidade, recomendações
- **LLM**: Google Gemini 2.5 Flash (transcrição, estruturação e explicações)
- **RAG**: LangChain + FAISS + HuggingFace embeddings (paraphrase-multilingual-MiniLM-L12-v2)
- **Documento Base**: `saude_simplificado.pdf` na pasta `data/`
- **Índice Vetorial**: Criado automaticamente em `backend/rag/faiss_index/` na primeira execução

### Estrutura do Projeto

```
aldeia-saude/
│
├── backend/
│   ├── main.py                          # Aplicação FastAPI principal
│   ├── requirements.txt                 # Dependências Python
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ingest.py               # Endpoints de entrada (texto/áudio)
│   │   │   ├── cases.py                # Endpoints de consulta de casos
│   │   │   └── explanation.py          # Geração de explicações médicas
│   │   │
│   │   ├── schemas/
│   │   │   └── case.py                 # Schemas Pydantic (CaseResponse)
│   │   │
│   │   ├── services/
│   │   │   ├── asr_service.py          # Transcrição de áudio (Gemini)
│   │   │   ├── structure_service.py    # Estruturação com LLM + RAG
│   │   │   └── explanation_service.py  # Geração de explicações
│   │   │
│   │   ├── repositories/
│   │   │   ├── case_repository.py              # CRUD de casos
│   │   │   ├── structured_data_repository.py   # CRUD de dados estruturados
│   │   │   └── medical_explanation_repository.py # CRUD de explicações
│   │   │
│   │   ├── tasks/
│   │   │   └── structure_task.py       # Background task de estruturação
│   │   │
│   │   ├── database/
│   │   │   ├── models.py               # SQLAlchemy models (Case, StructuredData, MedicalExplanation)
│   │   │   ├── session.py              # Gerenciamento de sessões
│   │   │   └── aldeia_saude.db         # Banco de dados
│   │   │
│   │   └── utils/
│   │
│   ├── rag/
│   │   └── faiss_index/                # Índice vetorial (gerado automaticamente)
│   │
│   ├── asr/
│   │   └── audio_samples/              # Áudios enviados
│   │
│   └── prompts/
│       ├── asr_prompt.txt              # Prompt de transcrição com vocabulário Yanomami
│       ├── structure_prompt.txt        # Prompt de extração estruturada + normalização
│       └── explanation_prompt.txt      # Prompt de narrativa SOAP + gravidade
│
├── frontend/                            # Interface React + Vite + TypeScript
│   ├── src/
│   │   ├── components/                 # Componentes reutilizáveis
│   │   ├── pages/                      # Páginas da aplicação
│   │   ├── services/                   # Chamadas à API
│   │   ├── context/                    # Context API (estado global)
│   │   ├── App.tsx                     # Componente principal
│   │   ├── main.tsx                    # Entry point
│   │   ├── index.css                   # Estilos globais
│   │   └── colors.css                  # Paleta de cores
│   │
│   ├── public/                         # Arquivos estáticos
│   ├── index.html                      # HTML base
│   ├── package.json                    # Dependências Node
│   ├── vite.config.ts                  # Configuração Vite
│   ├── tailwind.config.js              # Configuração Tailwind CSS
│   ├── tsconfig.json                   # Configuração TypeScript
│   └── README.md
│
├── data/
│   └── saude_simplificado.pdf          # Documento base de conhecimento
│
├── .env                                 # Variáveis de ambiente
├── .gitignore
└── README.md
```

## Endpoints Disponíveis

### Ingestão de Dados

- `POST /api/relatos/texto` - Criar relato a partir de texto
- `POST /api/relatos/audio` - Criar relato a partir de áudio (transcrito automaticamente)

### Consulta de Casos

- `GET /api/relatos` - Listar todos os casos com status
- `GET /api/relatos/{case_id}` - Buscar caso específico + dados estruturados

### Explicações Médicas

- `POST /api/relatos/{case_id}/explicar` - Gerar narrativa SOAP + gravidade + recomendações

## Configuração e Execução

### Pré-requisitos

- Python 3.11+
- Google API Key (Gemini)

### Como executar

Clone o repositório

```bash
git clone <repo-url>
cd aldeia-saude
```

#### Backend

1. Configure as variáveis de ambiente num .env

2. Instale as dependências

```bash
cd backend
pip install -r requirements.txt
```

3. Adicione o PDF de conhecimento

Coloque saude_simplificado.pdf na pasta data/

4. Execute o servidor

```bash
cd backend
uvicorn main:app --reload
```

O servidor estará disponível em `http://localhost:8000`  
Documentação interativa: `http://localhost:8000/docs`

#### Frontend

1. Instale as dependências

```bash
cd frontend
npm install
```

2. Execute o servidor

```bash
cd frontend
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

3. Credenciais de Demo

- **Email**: `admin@aldeia.com`
- **Senha**: `password123`

### Primeiro Uso

Na primeira execução, o sistema criará automaticamente:

- Banco de dados SQLite em `backend/api/database/aldeia_saude.db`
- Índice FAISS em `backend/rag/faiss_index/` (processamento do PDF)

## Fluxo de Uso

1. **Criar um relato**

```bash
POST /api/relatos/texto
{
  "relato": "O paciente está com ya wakë tukema e tosse há 3 dias"
}
```

2. **Verificar status do processamento**

```bash
GET /api/relatos/{case_id}
# Aguardar status: "completo"
```

3. **Gerar explicação médica**

```bash
POST /api/relatos/{case_id}/explicar
```

## Roadmap de Implementação

### Fase 1 — RAG e Processamento de Base de Conhecimento

- Criar PDF com vocabulário indígena + sintoma biomédico
- Carregar PDF e criar índice FAISS automaticamente
- Pipeline de limpeza de texto
- Implementar chunking e embeddings (HuggingFace)
- Indexar conhecimento no FAISS
- Configurar retrieval semântico

### Fase 2 — Módulo de Entrada (Áudio/Texto)

- Endpoint para entrada de texto: `POST /api/relatos/texto`
- Endpoint para upload de áudio: `POST /api/relatos/audio`
- Transcrição de áudio usando Gemini com prompt enriquecido (vocabulário Yanomami)
- Armazenamento dos relatos brutos no banco
- Validação mínima com pelo menos 5 dados mockados de texto e áudio

### Fase 3 — Estruturação de Dados com RAG

- Criar prompt de extração estruturada em JSON
- Integrar RAG para buscar termos indígenas relacionados aos sintomas
- Extrair: sintomas (pt-br), termos nativos correspondentes, significados
- Normalizar sintomas identificados
- Endpoint: `POST /api/relatos/estruturar`
- Salvar dados estruturados no banco
- Testar com no mínimo 5 dados mockados

**Schema de saída esperado:**

```json
{
  "paciente_nome": "string ou null",
  "paciente_sexo": "M | F | Indefinido",
  "sintomas_identificados_ptbr": ["sintoma1", "sintoma2"],
  "correspondencia_indigena": [
    {
      "termo_nativo": "termo yanomami",
      "significado_aproximado": "tradução",
      "contexto_cultural_saude": "explicação"
    }
  ],
  "categoria_sintoma": "categoria",
  "idade_paciente": "string ou null",
  "duracao_sintomas": "string ou null",
  "fator_desencadeante": "string ou null",
  "temperatura_graus": "float ou null",
  "pressao_arterial": "string ou null"
}
```

### Fase 4 — Geração de Explicações Médicas

- Criar prompt para explicação médica baseada nos sintomas estruturados
- Usar Gemini para gerar explicação contextualizada
- Gerar registro médico no método SOAP:
  - S (Subjetivo): O que o paciente relata (queixas, histórico).
  - O (Objetivo): Dados do profissional (exame físico, sinais vitais, exames).
  - A (Avaliação): Análise do profissional (possível diagnóstico).
  - P (Plano): Conduta (prescrições, encaminhamentos, atestados, exames).
- Incluir gravidade e recomendações básicas
- Endpoint: `POST /api/relatos/explicar`
- Salvar explicação vinculada ao caso

### Fase 5 — Interface e Dashboard

- Tela inicial com ações rápidas e resumo de quantidade de relatos, relatos processados, relatos que deram erro e casos recentes
- Entrada de caso: texto ou upload de áudio (pode enviar um arquivo de áudio ou gravar na hora)
- Tela de visualização do caso individual:
  - Relato original
  - Dados estruturados
  - Explicação médica
- Dashboard básico:
  - Total de casos registrados
  - Sintomas mais frequentes
  - Categorias
  - Linha temporal

### Fase 6 — Testes e Validação

- Testes de integração: entrada → estruturação → explicação → exibição
- Validação do RAG: verificar se termos indígenas corretos são recuperados
- Validação do ASR: verificar se está reconhecendo as palavras indígenas
- Validação da estruturação: comparar com casos anotados manualmente
- Testes de usabilidade: registrar relato por voz e texto

## Estrutura do Banco de Dados

```sql
-- Tabela de relatos brutos
cases (
  id,
  relato_original,
  tipo_entrada (audio/texto),
  created_at
)

-- Tabela de dados estruturados
structured_data (
  id,
  case_id,
  -- Dados do paciente
  paciente_nome,
  paciente_sexo (M/F/Indefinido),
  -- Sintomas
  sintomas_ptbr,
  termos_indigenas,
  categoria_sintoma,
  -- Dados clínicos
  idade_paciente,
  duracao_sintomas,
  fator_desencadeante,
  temperatura_graus,
  pressao_arterial,
  created_at
)

-- Tabela de explicações médicas
medical_explanations (
  id,
  case_id,
  explicacao,
  gravidade_sugerida,
  created_at
)
```
