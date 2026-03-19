# AI Workflow Guide for OrdoVertex

This guide explains how to build AI-powered workflows using OrdoVertex's AI nodes.

## Table of Contents

- [Overview](#overview)
- [AI Nodes](#ai-nodes)
  - [AI Agent](#ai-agent)
  - [AI Embedding](#ai-embedding)
  - [AI Vector Store](#ai-vector-store)
  - [Text Splitter](#text-splitter)
- [Supported AI Providers](#supported-ai-providers)
- [Setting Up AI Credentials](#setting-up-ai-credentials)
- [Common AI Workflow Patterns](#common-ai-workflow-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

OrdoVertex provides a comprehensive set of AI nodes that enable you to:

- **Chat with LLMs** using multiple providers (OpenAI, Anthropic, Google Gemini, Kimi AI, Ollama)
- **Generate embeddings** for text data
- **Store and search vectors** for Retrieval-Augmented Generation (RAG)
- **Process documents** with intelligent text splitting

---

## AI Nodes

### AI Agent

The **AI Agent** node is the primary interface for LLM interactions. It supports multi-turn conversations, tool usage, and memory.

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **AI Provider** | Select from OpenAI, Anthropic, Gemini, Kimi AI, Ollama, or Custom API | OpenAI |
| **Model** | Provider-specific model selection | Varies by provider |
| **Temperature** | Controls randomness (0-2) | 0.7 |
| **Max Tokens** | Maximum response length | 2000 |
| **System Prompt** | Instructions for the AI | "You are a helpful AI assistant." |
| **Enable Memory** | Remember conversation history | true |
| **Memory Key** | Unique identifier for conversation | `{{ $executionId }}` |
| **Enable Tools** | Allow AI to use tools | true |
| **Available Tools** | Select which tools the AI can use | `["get_current_time", "calculate"]` |
| **Max Iterations** | Maximum tool calls per request | 5 |
| **JSON Mode** | Force JSON output | false |

#### Built-in Tools

The AI Agent can use these built-in tools:

- **`get_current_time`** - Returns current date/time
- **`calculate`** - Evaluates mathematical expressions safely
- **`web_search`** - Placeholder for web search (integrate with your search API)
- **`http_request`** - Makes HTTP requests to external APIs

#### Usage Example

```
[Trigger] → [AI Agent] → [Respond to Webhook]
                ↓
         System: "You are a helpful assistant"
         User: "{{ $input.message }}"
```

#### Multi-turn Conversations

To maintain conversation context across executions:

1. Set **Enable Memory** to `true`
2. Use a consistent **Memory Key** (e.g., `user-{{ $input.userId }}`)
3. The AI will remember previous messages in the same conversation

---

### AI Embedding

The **AI Embedding** node converts text into vector embeddings for similarity search and RAG pipelines.

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **Provider** | OpenAI or Ollama | OpenAI |
| **Model** | Embedding model | `text-embedding-3-small` |
| **Input Field** | Field containing text to embed | `text` |

#### OpenAI Models

- `text-embedding-3-small` - Fast, cost-effective (1536 dimensions)
- `text-embedding-3-large` - Higher quality (3072 dimensions)
- `text-embedding-ada-002` - Legacy model (1536 dimensions)

#### Usage Example

```
[HTTP Request] → [Text Splitter] → [AI Embedding] → [AI Vector Store]
     (fetch doc)      (chunk text)      (embed chunks)     (store vectors)
```

---

### AI Vector Store

The **AI Vector Store** node provides in-memory storage for vector embeddings with cosine similarity search.

#### Operations

| Operation | Description |
|-----------|-------------|
| **upsert** | Add or update vectors |
| **search** | Find similar vectors |
| **delete** | Remove specific vectors |
| **clear** | Remove all vectors |

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **Operation** | Store operation | `upsert` |
| **Store Name** | Unique store identifier | `default` |
| **Top K** | Number of results for search | 5 |

#### Usage Example - RAG Pipeline

```
1. [AI Embedding] → [AI Vector Store]  (Store documents)
                         ↓
2. [AI Embedding] → [AI Vector Store]  (Search query)
                         ↓
3.              [AI Agent]              (Generate response with context)
```

---

### Text Splitter

The **Text Splitter** node chunks documents for processing by LLMs with context limits.

#### Splitter Types

| Type | Description | Best For |
|------|-------------|----------|
| **Recursive** | Splits by separators recursively | General documents |
| **Character** | Fixed character count | Simple text |
| **Token** | Approximate token count | LLM context management |
| **Markdown** | Splits by headers | Markdown documents |

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **Splitter Type** | Chunking strategy | `recursive` |
| **Chunk Size** | Target chunk size | 1000 |
| **Chunk Overlap** | Overlap between chunks | 200 |
| **Input Field** | Field containing text | `text` |

---

## Supported AI Providers

### OpenAI

**Models:** GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo

**Credential:** OpenAI API Key (starts with `sk-...`)

**Website:** https://platform.openai.com

---

### Anthropic Claude

**Models:** Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku

**Credential:** Anthropic API Key (starts with `sk-ant-...`)

**Website:** https://console.anthropic.com

---

### Google Gemini

**Models:** Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.5 Flash-8B

**Credential:** Google AI Studio API Key (starts with `AIza...`)

**Website:** https://aistudio.google.com

---

### Kimi AI (Moonshot)

**Models:** Kimi K2, Kimi K1.6, Kimi K1.5, Kimi Latest

**Credential:** Moonshot API Key (starts with `sk-...`)

**Base URL:** `https://api.moonshot.cn/v1`

**Website:** https://platform.moonshot.cn

**Note:** Kimi AI uses an OpenAI-compatible API, so it supports all OpenAI features including tool calling.

---

### Ollama (Local)

**Models:** Any model from Ollama library (llama3.1, mistral, codellama, etc.)

**Setup:** Run Ollama locally or on a server

**Default URL:** `http://localhost:11434`

**Website:** https://ollama.com

**Best for:** Privacy-sensitive data, offline use, cost control

---

### Custom API

Use any OpenAI-compatible API endpoint.

**Configuration:**
- API URL: Your custom endpoint
- API Key: Authentication token

---

## Setting Up AI Credentials

1. **Navigate to** Settings → Credentials
2. **Click** "Add Credential"
3. **Select** the AI provider type
4. **Enter** your API key
5. **Save** the credential

### Security Notes

- API keys are encrypted using AES-256-GCM
- Each credential is isolated per user
- Credentials are never exposed in workflow definitions

---

## Common AI Workflow Patterns

### Pattern 1: Simple Chatbot

```
[Webhook Trigger] → [AI Agent] → [Respond to Webhook]
```

**Use case:** Customer support, Q&A bot

---

### Pattern 2: Document Q&A (RAG)

```
[Document Upload] 
      ↓
[Text Splitter] → [AI Embedding] → [AI Vector Store: upsert]
                                          ↓
[User Question] → [AI Embedding] → [AI Vector Store: search]
                                          ↓
                              [AI Agent with context]
                                          ↓
                                    [Response]
```

**Use case:** Knowledge base search, document analysis

---

### Pattern 3: AI with Data Processing

```
[Database Trigger] → [SQL Query] → [Code: format data] → [AI Agent: analyze] → [Send Email]
```

**Use case:** Daily reports, data insights, anomaly detection

---

### Pattern 4: Multi-Agent Pipeline

```
[Input] → [AI Agent: classify] → [If: type check]
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
              [Agent A]         [Agent B]         [Agent C]
              (Technical)       (Sales)           (Support)
                    ↓                 ↓                 ↓
                    └─────────────────┴─────────────────┘
                                      ↓
                                [Aggregate] → [Output]
```

**Use case:** Ticket routing, content moderation

---

### Pattern 5: AI with External Tools

```
[Schedule Trigger] → [AI Agent with http_request tool]
                              ↓
                    [Fetch weather API]
                              ↓
                    [Generate daily brief]
                              ↓
                    [Post to Slack]
```

**Use case:** Automated reports, data aggregation

---

## Troubleshooting

### Common Issues

#### "API key is required"
- Ensure you've selected a credential or entered an API key
- Check that the credential hasn't expired

#### "Model not found"
- Verify the model name is correct for your provider
- Check if you have access to the model (some require special permissions)

#### "Max tokens exceeded"
- Reduce the **Max Tokens** setting
- Use the **Text Splitter** to chunk large inputs

#### "Context length exceeded"
- Enable **Text Splitter** to chunk documents
- Reduce conversation history by using a new **Memory Key**
- Use a model with larger context window

#### Tool calling not working
- Ensure **Enable Tools** is checked
- Add tools to **Available Tools** list
- Verify tool names match exactly (case-sensitive)

#### Memory not persisting
- Ensure **Enable Memory** is checked
- Use a consistent **Memory Key** between executions
- Memory is stored per execution context

### Provider-Specific Issues

**OpenAI:**
- Check rate limits at https://platform.openai.com/account/rate-limits
- Verify billing status

**Anthropic:**
- Claude has specific message format requirements (handled automatically)
- Tool calling may have different behavior than OpenAI

**Ollama:**
- Ensure Ollama is running: `ollama serve`
- Pull models first: `ollama pull llama3.1`
- Check Ollama logs for model loading errors

**Kimi AI:**
- Verify your base URL is correct
- Check Moonshot platform for rate limits

---

## Best Practices

1. **Use Credentials** - Don't hardcode API keys in workflows
2. **Split Large Documents** - Always use Text Splitter for documents >4000 tokens
3. **Set Memory Keys** - Use meaningful keys like `user-{{ $input.userId }}`
4. **Enable Continue on Fail** - For production workflows to handle API errors gracefully
5. **Monitor Costs** - Set up usage alerts with your AI provider
6. **Use Ollama for Testing** - Test workflows locally before using paid APIs

---

## Example: Complete RAG Workflow

```json
{
  "name": "Document Q&A",
  "nodes": [
    {
      "type": "webhookTrigger",
      "name": "question_received",
      "params": { "path": "ask" }
    },
    {
      "type": "aiEmbedding",
      "name": "embed_question",
      "params": {
        "provider": "openai",
        "model": "text-embedding-3-small",
        "inputField": "question"
      }
    },
    {
      "type": "aiVectorStore",
      "name": "search_docs",
      "params": {
        "operation": "search",
        "storeName": "knowledge_base",
        "topK": 3
      }
    },
    {
      "type": "code",
      "name": "build_context",
      "params": {
        "code": "return { context: $input.results.map(r => r.text).join('\\n\\n') }"
      }
    },
    {
      "type": "aiAgent",
      "name": "generate_answer",
      "params": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "systemPrompt": "Answer based on the provided context. If unsure, say so.",
        "enableMemory": false
      }
    }
  ],
  "connections": [
    ["question_received", "embed_question"],
    ["embed_question", "search_docs"],
    ["search_docs", "build_context"],
    ["build_context", "generate_answer"]
  ]
}
```

---

For more help, visit the OrdoVertex documentation or submit an issue on GitHub.
