import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Play, 
  Database, 
  Code, 
  Zap, 
  HelpCircle,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Github,
  Bot,
  Brain,
  Layers,
  FileText,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import './HelpCenter.css';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const documentationSections: DocSection[] = [
  {
    id: 'ai-workflows',
    title: 'AI Workflows',
    icon: <Brain size={20} />,
    content: (
      <div className="doc-content">
        <h2><Sparkles size={24} style={{display: 'inline', marginRight: '8px'}} />AI Workflow Guide</h2>
        <p>
          OrdoVertex provides powerful AI nodes that enable you to build intelligent workflows 
          with Large Language Models (LLMs), embeddings, and vector search.
        </p>

        <h3>Quick Start: Build Your First AI Workflow</h3>
        <ol>
          <li>Create a new workflow and name it "AI Assistant"</li>
          <li>Add a <strong>Webhook</strong> trigger to receive messages</li>
          <li>Drag an <strong>AI Agent</strong> node and connect it to the trigger</li>
          <li>Configure your AI provider (OpenAI, Gemini, Kimi, etc.)</li>
          <li>Add a <strong>Respond to Webhook</strong> node to return the AI response</li>
          <li>Save and test your workflow!</li>
        </ol>

        <h3>AI Nodes Overview</h3>

        <div className="node-doc">
          <h4><Bot size={18} style={{display: 'inline', marginRight: '6px'}} />AI Agent</h4>
          <p>Chat with LLMs using multiple providers. Supports memory, tools, and multi-step reasoning.</p>
          <div className="node-config">
            <strong>Key Features:</strong>
            <ul>
              <li><strong>Multiple Providers:</strong> OpenAI, Anthropic Claude, Google Gemini, Kimi AI, Ollama</li>
              <li><strong>Memory:</strong> Remember conversation history across executions</li>
              <li><strong>Tools:</strong> Let AI use built-in tools (calculator, HTTP requests, time)</li>
              <li><strong>JSON Mode:</strong> Force structured JSON output</li>
            </ul>
            <strong>Configuration Tips:</strong>
            <ul>
              <li>Use <code>{'{{ $executionId }}'}</code> as Memory Key for per-execution memory</li>
              <li>Use <code>user-{'{{ $input.userId }}'}</code> for user-specific conversations</li>
              <li>Set Temperature: 0.1 for factual, 0.7 for creative, 1.0+ for experimental</li>
              <li>Enable "Continue on Fail" for production workflows</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4><Layers size={18} style={{display: 'inline', marginRight: '6px'}} />AI Embedding</h4>
          <p>Convert text into vector embeddings for similarity search and RAG pipelines.</p>
          <div className="node-config">
            <strong>Providers:</strong>
            <ul>
              <li><strong>OpenAI:</strong> text-embedding-3-small (1536d), text-embedding-3-large (3072d)</li>
              <li><strong>Kimi AI:</strong> moonshot-embedding-1</li>
              <li><strong>Ollama:</strong> nomic-embed-text, or any local embedding model</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4><Database size={18} style={{display: 'inline', marginRight: '6px'}} />AI Vector Store</h4>
          <p>In-memory vector storage with cosine similarity search for RAG.</p>
          <div className="node-config">
            <strong>Operations:</strong>
            <ul>
              <li><strong>Upsert:</strong> Add/update vectors in the store</li>
              <li><strong>Search:</strong> Find similar vectors by query embedding</li>
              <li><strong>Delete:</strong> Remove specific vectors</li>
              <li><strong>Clear:</strong> Remove all vectors</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4><FileText size={18} style={{display: 'inline', marginRight: '6px'}} />Text Splitter</h4>
          <p>Chunk large documents for processing within LLM context limits.</p>
          <div className="node-config">
            <strong>Splitter Types:</strong>
            <ul>
              <li><strong>Recursive:</strong> Best for general documents</li>
              <li><strong>Character:</strong> Fixed size chunks</li>
              <li><strong>Token:</strong> LLM-aware token counting</li>
              <li><strong>Markdown:</strong> Split by headers</li>
            </ul>
            <strong>Tip:</strong> Set chunk size ~1000 and overlap ~200 for best results
          </div>
        </div>

        <h3>Supported AI Providers</h3>
        <table className="shortcuts-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Models</th>
              <th>Features</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>OpenAI</strong></td>
              <td>GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5</td>
              <td>Tools, JSON mode, Embeddings</td>
            </tr>
            <tr>
              <td><strong>Anthropic</strong></td>
              <td>Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku</td>
              <td>Long context, Excellent reasoning</td>
            </tr>
            <tr>
              <td><strong>Google Gemini</strong></td>
              <td>Gemini 2.0 Flash, Gemini 1.5 Pro/Flash</td>
              <td>Multimodal, Large context</td>
            </tr>
            <tr>
              <td><strong>Kimi AI</strong></td>
              <td>Kimi K2, K1.6, K1.5, Latest</td>
              <td>OpenAI-compatible, Tools</td>
            </tr>
            <tr>
              <td><strong>Ollama</strong></td>
              <td>llama3.1, mistral, codellama, etc.</td>
              <td>Local, Private, Free</td>
            </tr>
          </tbody>
        </table>

        <h3>Common AI Workflow Patterns</h3>

        <div className="node-doc">
          <h4><Lightbulb size={18} style={{display: 'inline', marginRight: '6px'}} />Pattern 1: Simple Chatbot</h4>
          <pre><code>{`[Webhook Trigger] → [AI Agent] → [Respond to Webhook]

AI Agent Settings:
- Provider: OpenAI
- Model: gpt-4o-mini
- System: "You are a helpful assistant"
- Memory Key: user-{'{{ $input.userId }}'}`}</code></pre>
        </div>

        <div className="node-doc">
          <h4><Lightbulb size={18} style={{display: 'inline', marginRight: '6px'}} />Pattern 2: Document Q&A (RAG)</h4>
          <pre><code>{`Document Upload → [Text Splitter] → [AI Embedding] → [Vector Store: upsert]

User Question → [AI Embedding] → [Vector Store: search] → 
[AI Agent with context] → Response

AI Agent System Prompt:
"Answer based on this context: {'{{ $input.context }}'}"`}</code></pre>
        </div>

        <div className="node-doc">
          <h4><Lightbulb size={18} style={{display: 'inline', marginRight: '6px'}} />Pattern 3: AI with Tools</h4>
          <pre><code>{`[Schedule Trigger] → [AI Agent with tools enabled]
                           ↓
                    [HTTP Request tool]
                           ↓
                    [Fetch weather API]
                           ↓
                    [Generate daily brief]
                           ↓
                    [Post to Slack]`}</code></pre>
        </div>

        <h3>Setting Up AI Credentials</h3>
        <ol>
          <li>Go to <strong>Settings → Credentials</strong></li>
          <li>Click <strong>"Add Credential"</strong></li>
          <li>Select your AI provider (OpenAI, Gemini, Kimi, etc.)</li>
          <li>Enter your API key</li>
          <li>Save and use in AI nodes</li>
        </ol>

        <h3>Troubleshooting Tips</h3>
        <ul>
          <li><strong>"API key is required"</strong> - Check credential is selected and valid</li>
          <li><strong>Context too long</strong> - Use Text Splitter to chunk documents</li>
          <li><strong>Memory not persisting</strong> - Use consistent Memory Key between executions</li>
          <li><strong>High costs</strong> - Use Ollama for local testing, smaller models for simple tasks</li>
          <li><strong>Slow responses</strong> - Consider using GPT-4o Mini or Gemini Flash</li>
        </ul>

        <div className="note" style={{background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginTop: '16px'}}>
          <strong>💡 Pro Tip:</strong> Start with <strong>GPT-4o Mini</strong> or <strong>Gemini Flash</strong> for cost-effective prototyping, 
          then upgrade to larger models for production if needed.
        </div>
      </div>
    )
  },

  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play size={20} />,
    content: (
      <div className="doc-content">
        <h2>Getting Started with OrdoVertex</h2>
        <p>
          OrdoVertex is a workflow automation platform that allows you to connect different services 
          and automate tasks without writing code.
        </p>
        
        <h3>Your First Workflow</h3>
        <ol>
          <li>Click <strong>"New Workflow"</strong> on the Workflows page</li>
          <li>Give your workflow a name and description</li>
          <li>Drag a <strong>Trigger</strong> node from the left panel (e.g., Webhook or Schedule)</li>
          <li>Add Action nodes to process data</li>
          <li>Connect nodes by dragging from output to input handles</li>
          <li>Configure each node by clicking on it</li>
          <li>Click <strong>"Save"</strong> to save your workflow</li>
          <li>Click <strong>"Execute"</strong> to test it</li>
        </ol>

        <h3>Key Concepts</h3>
        <ul>
          <li><strong>Workflow:</strong> A series of connected nodes that perform automated tasks</li>
          <li><strong>Node:</strong> An individual step in a workflow (trigger or action)</li>
          <li><strong>Connection:</strong> A link between nodes that passes data</li>
          <li><strong>Execution:</strong> A single run of a workflow</li>
        </ul>
      </div>
    )
  },
  {
    id: 'triggers',
    title: 'Triggers',
    icon: <Zap size={20} />,
    content: (
      <div className="doc-content">
        <h2>Understanding Triggers</h2>
        <p>
          Triggers are special nodes that start your workflow. Every workflow must start with a trigger.
        </p>

        <h3>Available Triggers</h3>
        
        <div className="node-doc">
          <h4>Manual Trigger</h4>
          <p>Starts workflow execution when you click the "Execute" button. Useful for testing and one-time operations.</p>
          <div className="node-config">
            <strong>No configuration required</strong>
          </div>
        </div>

        <div className="node-doc">
          <h4>Webhook</h4>
          <p>Starts workflow when an HTTP request is received. Perfect for integrating with external services.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Path:</strong> Unique URL path for this webhook</li>
              <li><strong>Method:</strong> HTTP method (GET, POST, PUT, DELETE, PATCH)</li>
              <li><strong>Authentication:</strong> Optional API key or header-based auth</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4>Schedule</h4>
          <p>Runs workflow at specified intervals. Ideal for recurring tasks and reports.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Rule:</strong> Cron expression (e.g., <code>0 9 * * 1</code> for Mondays at 9 AM)</li>
              <li><strong>Timezone:</strong> Select your local timezone</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'actions',
    title: 'Actions',
    icon: <Code size={20} />,
    content: (
      <div className="doc-content">
        <h2>Action Nodes</h2>
        <p>
          Action nodes perform operations on data, make external requests, or execute logic.
        </p>

        <h3>Core Actions</h3>

        <div className="node-doc">
          <h4>HTTP Request</h4>
          <p>Makes HTTP requests to external APIs and services.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Method:</strong> GET, POST, PUT, DELETE, PATCH</li>
              <li><strong>URL:</strong> The endpoint to call</li>
              <li><strong>Headers:</strong> Custom HTTP headers (JSON object)</li>
              <li><strong>Body:</strong> Request body for POST/PUT/PATCH</li>
              <li><strong>Authentication:</strong> Basic Auth, Header Auth, or OAuth2</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4>SQL Database</h4>
          <p>Execute SQL queries against PostgreSQL, MySQL, MSSQL, or SQLite databases.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Database Type:</strong> Select your database</li>
              <li><strong>Connection:</strong> Host, port, credentials</li>
              <li><strong>Operation:</strong> Execute Query, Insert, Update, Delete, Select</li>
              <li><strong>Query:</strong> SQL query with parameter placeholders</li>
              <li><strong>Parameters:</strong> Array of values to substitute</li>
            </ul>
            <p className="note">
              <strong>Note:</strong> Use <code>$1</code>, <code>$2</code>, etc. for PostgreSQL/SQLite or <code>?</code> for MySQL as placeholders.
            </p>
          </div>
        </div>

        <div className="node-doc">
          <h4>Code</h4>
          <p>Execute custom JavaScript code to transform data.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Code:</strong> JavaScript code to execute</li>
              <li><strong>Input:</strong> Available as <code>input</code> variable</li>
              <li><strong>Output:</strong> Return value becomes the node output</li>
            </ul>
            <pre><code>{`// Example: Transform input data
const data = input.json;
return {
  fullName: data.firstName + ' ' + data.lastName,
  email: data.email.toLowerCase(),
  timestamp: new Date().toISOString()
};`}</code></pre>
          </div>
        </div>

        <div className="node-doc">
          <h4>Set</h4>
          <p>Set or modify values in your data.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Values:</strong> Key-value pairs to set</li>
              <li><strong>Keep Only Set:</strong> Only output the specified values</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4>If</h4>
          <p>Conditionally route workflow based on conditions.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Condition:</strong> JavaScript expression that evaluates to true/false</li>
              <li><strong>True Output:</strong> Executed when condition is true</li>
              <li><strong>False Output:</strong> Executed when condition is false</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4>Wait</h4>
          <p>Pause workflow execution for a specified time.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Amount:</strong> Number of time units</li>
              <li><strong>Unit:</strong> Seconds, Minutes, Hours</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4>Split</h4>
          <p>Split data into multiple items for processing.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Field:</strong> The array field to split on</li>
            </ul>
          </div>
        </div>

        <div className="node-doc">
          <h4>Aggregate</h4>
          <p>Combine multiple items into a single item.</p>
          <div className="node-config">
            <strong>Configuration:</strong>
            <ul>
              <li><strong>Aggregate By:</strong> Field to group items by</li>
              <li><strong>Operations:</strong> Sum, Average, Count, Min, Max</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'expressions',
    title: 'Expressions',
    icon: <Code size={20} />,
    content: (
      <div className="doc-content">
        <h2>Using Expressions</h2>
        <p>
          Expressions allow you to reference data from previous nodes and perform dynamic operations.
        </p>

        <h3>Syntax</h3>
        <ul>
          <li><code>{'{{$json}}'}</code> - Access the full JSON output from previous node</li>
          <li><code>{'{{$json.fieldName}}'}</code> - Access a specific field</li>
          <li><code>{'{{$json.nested.field}}'}</code> - Access nested fields</li>
          <li><code>{'{{$json.array[0]}}'}</code> - Access array elements</li>
        </ul>

        <h3>Special Variables</h3>
        <ul>
          <li><code>{'{{$input}}'}</code> - Input to the current node</li>
          <li><code>{'{{$workflow}}'}</code> - Workflow metadata</li>
          <li><code>{'{{$execution}}'}</code> - Execution metadata</li>
          <li><code>{'{{$now}}'}</code> - Current timestamp</li>
          <li><code>{'{{$today}}'}</code> - Today's date at midnight</li>
        </ul>

        <h3>Functions</h3>
        <ul>
          <li><code>$max(array)</code> - Maximum value</li>
          <li><code>$min(array)</code> - Minimum value</li>
          <li><code>$avg(array)</code> - Average value</li>
          <li><code>$sum(array)</code> - Sum of values</li>
          <li><code>$formatDate(date, format)</code> - Format a date</li>
          <li><code>$now()</code> - Current date/time</li>
        </ul>

        <h3>Examples</h3>
        <pre><code>{`// Combine first and last name
{{$json.firstName}} {{$json.lastName}}

// Access nested data
{{$json.address.city}}

// Format a date
{{$formatDate($json.createdAt, 'YYYY-MM-DD')}}

// Calculate total
Total: {{$sum($json.items[].price)}}`}</code></pre>
      </div>
    )
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: <BookOpen size={20} />,
    content: (
      <div className="doc-content">
        <h2>Keyboard Shortcuts</h2>
        
        <h3>Workflow Editor</h3>
        <table className="shortcuts-table">
          <tbody>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
              <td>Save workflow</td>
            </tr>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>Enter</kbd></td>
              <td>Execute workflow</td>
            </tr>
            <tr>
              <td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td>
              <td>Delete selected node</td>
            </tr>
            <tr>
              <td><kbd>Escape</kbd></td>
              <td>Deselect node / Close panel</td>
            </tr>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>A</kbd></td>
              <td>Select all nodes</td>
            </tr>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
              <td>Undo</td>
            </tr>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td>
              <td>Redo</td>
            </tr>
          </tbody>
        </table>

        <h3>Navigation</h3>
        <table className="shortcuts-table">
          <tbody>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>K</kbd></td>
              <td>Quick search</td>
            </tr>
            <tr>
              <td><kbd>?</kbd></td>
              <td>Open help</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }
];

export function HelpCenter() {
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = documentationSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof section.content === 'string' && section.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeContent = documentationSections.find(s => s.id === activeSection)?.content;

  return (
    <div className="help-center">
      <div className="help-sidebar">
        <div className="help-header">
          <HelpCircle size={24} />
          <h2>Help Center</h2>
        </div>

        <div className="help-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="help-nav">
          {filteredSections.map(section => (
            <button
              key={section.id}
              className={`help-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{section.title}</span>
              <ChevronRight size={16} className="chevron" />
            </button>
          ))}
        </nav>

        <div className="help-footer">
          <h4>Need more help?</h4>
          <a href="#" className="help-link">
            <MessageCircle size={16} />
            Contact Support
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="help-link">
            <Github size={16} />
            GitHub Repository
          </a>
        </div>
      </div>

      <div className="help-content">
        {activeContent || (
          <div className="help-welcome">
            <BookOpen size={64} />
            <h2>Welcome to OrdoVertex Documentation</h2>
            <p>
              Learn how to build powerful workflows and automate your tasks.
              Select a topic from the sidebar to get started.
            </p>
            <div className="help-cards">
              <div className="help-card" onClick={() => setActiveSection('getting-started')}>
                <Play size={32} />
                <h3>Getting Started</h3>
                <p>Learn the basics and create your first workflow</p>
              </div>
              <div className="help-card" onClick={() => setActiveSection('ai-workflows')}>
                <Sparkles size={32} />
                <h3>AI Workflows</h3>
                <p>Build intelligent workflows with LLMs and RAG</p>
              </div>
              <div className="help-card" onClick={() => setActiveSection('triggers')}>
                <Zap size={32} />
                <h3>Triggers</h3>
                <p>Understand how to start your workflows</p>
              </div>
              <div className="help-card" onClick={() => setActiveSection('actions')}>
                <Database size={32} />
                <h3>Actions</h3>
                <p>Explore available action nodes</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
