# OrdoVertex Workflow Tutorials

Step-by-step guides to building common workflows. No coding required — just drag, connect, and configure.

---

## Table of Contents

1. [Tutorial 1: Your First Workflow — Webhook Alert](#tutorial-1-your-first-workflow--webhook-alert)
2. [Tutorial 2: Daily Database Report](#tutorial-2-daily-database-report)
3. [Tutorial 3: Build an AI Chatbot API](#tutorial-3-build-an-ai-chatbot-api)
4. [Tutorial 4: Auto-Process Files from a Folder](#tutorial-4-auto-process-files-from-a-folder)
5. [Tutorial 5: Smart Approval Routing](#tutorial-5-smart-approval-routing)
6. [Tutorial 6: Fetch & Transform API Data](#tutorial-6-fetch--transform-api-data)
7. [Tips & Shortcuts](#tips--shortcuts)

---

## Tutorial 1: Your First Workflow — Webhook Alert

**What it does:** Send yourself an email every time an external system calls a webhook URL.

**Flow:**
```
[Webhook Trigger] → [Send Email]
```

### Step 1 — Create the workflow
1. Click **New Workflow** (top-left).
2. Name it `Webhook Alert`.

### Step 2 — Add the Webhook Trigger
1. From the left panel, drag **Webhook** onto the canvas.
2. Click the node to open the right config panel:
   - **HTTP Method:** `POST`
   - **Path:** `alert` (the full URL will be `/webhooks/<workflow-id>` or a custom path if configured)
   - **Response Mode:** `Immediate` (sends a quick "OK" back to the caller)
3. Close the panel. The trigger is now listening.

### Step 3 — Add Send Email
1. Drag **Send Email** from the **Actions** category onto the canvas.
2. Connect the **Webhook** output dot to the **Send Email** input dot.
3. Configure Send Email:
   - **Credential:** Add your SMTP credentials first via **Settings → Credentials**, then select it here.
   - **To:** your own email address.
   - **Subject:** `Webhook received!`
   - **Body:**
     ```
     A webhook was triggered.
     Payload: {{ $json }}
     ```
   - **Format:** `Plain Text`

### Step 4 — Activate & Test
1. Click **Save** (top-right).
2. Toggle the **Activate** switch to ON.
3. Copy the webhook URL shown in the Webhook node.
4. Test it from your terminal:
   ```bash
   curl -X POST <your-webhook-url> \
     -H "Content-Type: application/json" \
     -d '{"event":"new_signup","user":"alice"}'
   ```
5. Check your inbox. You should see the email with the JSON payload.

> **Tip:** If you don't see the email, open **Results** (top bar) to view execution logs and any error messages.

---

## Tutorial 2: Daily Database Report

**What it does:** Run a SQL query every morning and email the results.

**Flow:**
```
[Schedule Trigger] → [SQL Database] → [Send Email]
```

### Step 1 — Create the workflow
1. Click **New Workflow** and name it `Daily Report`.

### Step 2 — Add Schedule Trigger
1. Drag **Schedule Trigger** onto the canvas.
2. Configure:
   - **Trigger Type:** `Simple`
   - **Interval:** `Daily`
   - **Hour:** `8`
   - **Minute:** `0`
   - **Timezone:** pick yours

### Step 3 — Add SQL Database
1. Drag **SQL Database** from **Actions** onto the canvas.
2. Connect **Schedule Trigger** → **SQL Database**.
3. Configure:
   - **Credential:** Add your DB credentials in **Settings → Credentials** first, then select them.
   - **Database Type:** `PostgreSQL` (or MySQL / MSSQL / SQLite)
   - **Operation:** `Select`
   - **Query:**
     ```sql
     SELECT COUNT(*) as total_orders,
            SUM(amount) as total_revenue
     FROM orders
     WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
     ```

### Step 4 — Add Send Email
1. Drag **Send Email** onto the canvas.
2. Connect **SQL Database** → **Send Email**.
3. Configure:
   - **To:** your email.
   - **Subject:** `Daily Report — {{ $now.format('YYYY-MM-DD') }}`
   - **Body:**
     ```
     Good morning!

     Yesterday's stats:
     - Orders: {{ $json[0].total_orders }}
     - Revenue: {{ $json[0].total_revenue }}
     ```
   - **Format:** `Plain Text`

### Step 5 — Save & Activate
1. Click **Save**.
2. Toggle **Activate** to ON.
3. The workflow will now run automatically every day at 8:00 AM.

> **Tip:** Click **Execute** manually at any time to test it before waiting for the schedule.

---

## Tutorial 3: Build an AI Chatbot API

**What it does:** Expose an HTTP endpoint that receives a message and replies with an AI-generated answer.

**Flow:**
```
[Webhook Trigger] → [AI Agent] → [Webhook Response]
```

### Step 1 — Create the workflow
1. Click **New Workflow** and name it `AI Chatbot`.

### Step 2 — Set up AI Credentials
1. Go to **Settings → Credentials**.
2. Click **Add Credential**.
3. Choose your provider (e.g., **OpenAI**) and paste your API key.
4. Save.

### Step 3 — Add Webhook Trigger
1. Drag **Webhook** onto the canvas.
2. Configure:
   - **HTTP Method:** `POST`
   - **Path:** `chat`
   - **Response Mode:** `Last Node` (returns whatever the last node outputs)

### Step 4 — Add AI Agent
1. Drag **AI Agent** from the **AI** category onto the canvas.
2. Connect **Webhook** → **AI Agent**.
3. Configure:
   - **AI Provider:** `OpenAI` (or Anthropic, Gemini, Kimi, Ollama)
   - **Credential:** select the one you just added
   - **Model:** `gpt-4o-mini` (or any model you prefer)
   - **System Prompt:** `You are a helpful assistant. Keep answers under 3 sentences.`
   - **User Message:** `{{ $json.message }}`
   - **Enable Memory:** `true`
   - **Memory Key:** `user-{{ $json.userId }}`
   - **Enable Tools:** `false` (keep it simple for now)

### Step 5 — Add Webhook Response
1. Drag **Webhook Response** onto the canvas.
2. Connect **AI Agent** → **Webhook Response**.
3. Configure:
   - **Status Code:** `200`
   - **Response Body:**
     ```json
     {
       "reply": "{{ $json.content }}"
     }
     ```

### Step 6 — Save, Activate & Test
1. Click **Save**, then **Activate**.
2. Test with curl:
   ```bash
   curl -X POST <your-webhook-url> \
     -H "Content-Type: application/json" \
     -d '{"message":"What is RAG?","userId":"123"}'
   ```
3. You should get back:
   ```json
   {"reply":"RAG stands for Retrieval-Augmented Generation..."}
   ```

> **Tip:** The `Memory Key` means if user `123` asks a follow-up question, the AI remembers the conversation.

---

## Tutorial 4: Auto-Process Files from a Folder

**What it does:** Watch a local folder for new files, read their contents, and move them to a "processed" folder.

**Flow:**
```
[File Watch] → [Code] → [SFTP]
```

### Step 1 — Create the workflow
1. Click **New Workflow** and name it `File Processor`.

### Step 2 — Add File Watch
1. Drag **File Watch** from **Triggers** onto the canvas.
2. Configure:
   - **Folder Path:** `/data/incoming` (must be inside an allowed directory — ask your admin)
   - **File Pattern:** `*.csv`
   - **Read Content:** `true`
   - **Encoding:** `UTF-8`
   - **Delete After Read:** `false` (we will move it instead)
   - **Max Files Per Run:** `10`

### Step 3 — Add a Code node (to parse CSV content)
1. Drag **Code** from **Actions** onto the canvas.
2. Connect **File Watch** → **Code**.
3. Configure:
   - **Language:** `JavaScript`
   - **Code:**
     ```javascript
     const lines = $input.content.split('\n');
     const headers = lines[0].split(',');
     const rows = lines.slice(1).map(line => {
       const values = line.split(',');
       const obj = {};
       headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
       return obj;
     });
     return {
       fileName: $input.fileName,
       rowCount: rows.length,
       rows: rows
     };
     ```

### Step 4 — Add SFTP (to move the file)
1. Drag **SFTP** from **Actions** onto the canvas.
2. Connect **Code** → **SFTP**.
3. Configure:
   - **Credential:** your SFTP credentials.
   - **Operation:** `Move/Rename`
   - **Source Path:** `{{ $input.filePath }}`
   - **Destination Path:** `/data/processed/{{ $input.fileName }}`

### Step 5 — Save & Activate
1. Click **Save**, then **Activate**.
2. Drop a `.csv` file into `/data/incoming`.
3. The workflow will pick it up, parse it, and move it to `/data/processed/`.

> **Tip:** Open **Results** after dropping a file to see the parsed rows and any errors.

---

## Tutorial 5: Smart Approval Routing

**What it does:** Receive a request, check its value, and route high-value requests to a manager while auto-approving small ones.

**Flow:**
```
[Webhook Trigger] → [IF] → [Send Email: Manager Approval]
              ↓
        [Send Email: Auto-Approved]
```

### Step 1 — Create the workflow
1. Click **New Workflow** and name it `Approval Router`.

### Step 2 — Add Webhook Trigger
1. Drag **Webhook** onto the canvas.
2. Configure:
   - **HTTP Method:** `POST`
   - **Path:** `request`
   - **Response Mode:** `Immediate`

### Step 3 — Add IF Node
1. Drag **IF** from **Actions** onto the canvas.
2. Connect **Webhook** → **IF**.
3. Configure the condition:
   - **Logic:** `AND`
   - **Condition 1:**
     - **Field:** `{{ $json.amount }}`
     - **Operator:** `greaterThan`
     - **Value:** `1000`
   - Leave the second condition empty.

The IF node has two output branches: **true** (amount > 1000) and **false** (amount ≤ 1000).

### Step 4 — Add "Manager Approval" Email (true branch)
1. Drag **Send Email** onto the canvas.
2. Connect the **true** output dot (top) of the IF node to this email node.
3. Configure:
   - **To:** `manager@company.com`
   - **Subject:** `Approval needed: ${{ $json.amount }} request`
   - **Body:**
     ```
     A request requires your approval:

     Requester: {{ $json.requester }}
     Amount:    {{ $json.amount }}
     Reason:    {{ $json.reason }}
     ```

### Step 5 — Add "Auto-Approved" Email (false branch)
1. Drag another **Send Email** onto the canvas.
2. Connect the **false** output dot (bottom) of the IF node to this email node.
3. Configure:
   - **To:** `{{ $json.requesterEmail }}`
   - **Subject:** `Your request was auto-approved`
   - **Body:**
     ```
     Hi,

     Your request for ${{ $json.amount }} has been auto-approved.
     ```

### Step 6 — Save, Activate & Test
1. Click **Save**, then **Activate**.
2. Test a low-value request:
   ```bash
   curl -X POST <your-webhook-url> \
     -d '{"amount":50,"requester":"Alice","reason":"Stationery","requesterEmail":"alice@company.com"}'
   ```
   → Alice gets the auto-approval email.

3. Test a high-value request:
   ```bash
   curl -X POST <your-webhook-url> \
     -d '{"amount":5000,"requester":"Bob","reason":"New laptop","requesterEmail":"bob@company.com"}'
   ```
   → The manager gets the approval email.

> **Tip:** Add a **Wait** node after the manager email if you want to pause and later resume the workflow (advanced).

---

## Tutorial 6: Fetch & Transform API Data

**What it does:** Pull data from a public API, keep only the fields you need, rename them, and email a summary.

**Flow:**
```
[Schedule Trigger] → [HTTP Request] → [Filter] → [Rename Fields] → [Send Email]
```

### Step 1 — Create the workflow
1. Click **New Workflow** and name it `API Digest`.

### Step 2 — Add Schedule Trigger
1. Drag **Schedule Trigger** onto the canvas.
2. Configure:
   - **Trigger Type:** `Simple`
   - **Interval:** `Hourly`

### Step 3 — Add HTTP Request
1. Drag **HTTP Request** from **Actions** onto the canvas.
2. Connect **Schedule Trigger** → **HTTP Request**.
3. Configure:
   - **Method:** `GET`
   - **URL:** `https://jsonplaceholder.typicode.com/posts`
   - **Response Format:** `JSON`

### Step 4 — Add Filter
1. Drag **Filter** from **Transform** onto the canvas.
2. Connect **HTTP Request** → **Filter**.
3. Configure:
   - **Condition:** `userId equals 1`
   - The Filter node keeps only items where `userId` is `1`.

### Step 5 — Add Rename Fields
1. Drag **Rename Fields** from **Transform** onto the canvas.
2. Connect **Filter** → **Rename Fields**.
3. Configure:
   - **Renames:**
     - `title` → `post_title`
     - `body` → `post_body`

### Step 6 — Add Send Email
1. Drag **Send Email** onto the canvas.
2. Connect **Rename Fields** → **Send Email**.
3. Configure:
   - **To:** your email.
   - **Subject:** `Hourly API Digest`
   - **Body:**
     ```
     Here are the latest posts from user 1:

     {{#each $json}}
     Title: {{ post_title }}
     Body:  {{ post_body }}
     ---
     {{/each}}
     ```
   - **Format:** `Plain Text`

### Step 7 — Save, Activate & Test
1. Click **Save**, then **Activate**.
2. Click **Execute** to run it once immediately.
3. Check your email for the filtered, renamed posts.

> **Tip:** Add a **Sort** node between Filter and Rename Fields if you want the posts ordered by `id`.

---

## Tips & Shortcuts

### Expression Cheat Sheet
Use these inside any text field to insert dynamic data:

| Expression | Meaning |
|-----------|---------|
| `{{ $json }}` | Entire output from the previous node |
| `{{ $json.fieldName }}` | A specific field from the previous node |
| `{{ $json[0].fieldName }}` | First item's field (when previous node returns an array) |
| `{{ $input.fieldName }}` | Field from the original trigger input |
| `{{ $executionId }}` | Unique ID for this run |
| `{{ $now }}` | Current timestamp |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Remove selected node or edge |
| `Ctrl + S` | Save workflow |
| `Ctrl + Enter` | Execute workflow |
| Scroll wheel | Zoom canvas |
| Drag background | Pan canvas |

### Best Practices

1. **Save often** — The canvas auto-saves on some actions, but hit **Save** before leaving.
2. **Name your nodes** — Double-click a node name to rename it (e.g., "Send Email" → "Email Manager"). It makes debugging much easier.
3. **Test step-by-step** — Run the workflow after adding each new node. Open **Results** to inspect data at every step.
4. **Use credentials** — Never paste API keys directly into node fields. Store them in **Settings → Credentials**.
5. **Enable "Continue on Fail"** — For production workflows, select a node and enable this option so one failure doesn't kill the entire run.
6. **Add sticky notes** — Drag a **Sticky Note** from the left panel to document what a section of your workflow does. Your future self will thank you.

---

## Next Steps

- **AI Workflows:** See [`AI_WORKFLOW_GUIDE.md`](AI_WORKFLOW_GUIDE.md) for RAG pipelines, embeddings, and multi-agent setups.
- **Custom Nodes:** See [`NODE_DEVELOPMENT_GUIDE.md`](NODE_DEVELOPMENT_GUIDE.md) if you want to build your own nodes in TypeScript.
- **API Reference:** See [`API.md`](API.md) for programmatic workflow management.

Happy automating! 🚀
