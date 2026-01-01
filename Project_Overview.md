PROJECT OVERVIEW - ModifyMe Consulting Agent Workspaces
UPDATED: 01/01/2025

**Here is a high-level concept of what I want to achieve (please note - some key conceptual changes have been made to this plan, please ensure the Project Overview below is only considered as a direction/vision rather than a blueprint**

# Generative UI Workspace 🚀  

**Agentic, multi-surface Generative UI for data & workflows — built on Next.js, CopilotKit, and Material UI.**

> **Build systems that build interfaces.**  
> This workspace is a GenUI R&D and implementation lab: it combines CopilotKit’s Generative UI patterns, a Next.js app, and an agentic backend to let AI generate dashboards, tools, and “disposable UIs” from natural language — safely, consistently, and with enterprise-grade guardrails.

---

## 🎯 What Is This?

A **Generative UI workspace** for designing, prototyping, and operationalizing AI‑generated interfaces:

- **Next.js + CopilotKit GenUI**: Streaming, agentic chat + canvas with server-side orchestration
- **Static + Declarative + Open‑Ended GenUI**: From safe component routing to sandboxed HTML/JS
- **MUI‑backed Component Registry**: Opinionated library of reusable “molecules” for charts, cards & tables
- **Sandboxed HTML Canvas**: Isolated iframe runtime for open‑ended UI experiments
- **Architecture Blueprints**: Deep architectural docs for AG‑UI, Chat+, and multi-layer GenUI systems

This workspace is optimized for **architecting and validating a GenUI stack**, not just demoing a single app. It’s where you:

- Design agent → UI protocols (AG‑UI style)
- Build a component registry that AI can reliably use
- Experiment with safe open‑ended code generation in a sandbox
- Evaluate UX patterns like Chat+, AI Elements, and Ghost UI

---

## 📚 Documentation & Reference

### Core Concepts & Architecture

- **[Implementing Generative UI Architecture](./Implementing%20Generative%20UI%20Architecture.md)**  
  Deep dive into GenUI layers: Cognitive, Orchestration, Presentation; Static vs Declarative vs Open‑Ended; AG‑UI patterns.

- **[Generative UI Plan with CopilotKit](./Generative%20UI%20Plan%20with%20CopilotKit.md)**  
  End‑to‑end implementation plan: Next.js + CopilotKit + MUI, Chat+ canvas, sandboxing, AI Elements, evaluation strategy.

- **GenUI Starter Plan** (`GenUI_Plan.md`)  
  High‑level file map and external references:
  - Generative UI starter app structure
  - CopilotKit Generative UI docs
  - MUI / Toolpad / CRUD template references
  - AgenticGenUI / AI Elements links

### CopilotKit Prompts (GenUI “OS”)

Under `prompts/copilot/` (from the starter):

- `01_molecules.md` — defines component vocabulary (cards, stats, tables)
- `02_tools_and_routes.md` — tool calling and backend routing patterns
- `03_canvas_and_state.md` — Chat+ canvas, state sync, agentic updates
- `04_tests.md` — testing + evaluation prompts
- `05_sandboxed_open_ended.md` — safe open‑ended HTML/JS generation
- `06_refactoring.md` — iterative improvement and refactors

These prompts act as the **Cognitive Layer specification** — the instruction “OS” that tells the model how to think about UI, state, tools, and safety.

---

## 📂 Project Structure (Conceptual)

This workspace is anchored around a **GenUI starter** with a Next.js app, CopilotKit integration, and a small but expressive set of generative components.

```text
genui-starter/
├─ README.md
├─ app/
│  ├─ api/
│  │  └─ chat/
│  │     └─ route.ts           # CopilotKit backend / Edge entry for LLM + tools
│  └─ canvas/
│     └─ GenerativeCanvas.tsx  # Chat+ style persistent canvas for GenUI
├─ components/
│  ├─ ai/
│  │  └─ StreamingSkeleton.tsx # Generative streaming & AI Elements skeletons
│  ├─ registry/
│  │  ├─ StatCard.tsx          # MUI‑style metric cards (Static GenUI molecule)
│  │  ├─ DataTable.tsx         # Data grid / table molecule
│  │  └─ ChartCard.tsx         # Chart wrapper (e.g., Recharts/Chart.js)
│  ├─ renderers/
│  │  └─ DashboardRenderer.tsx # Declarative schema → component layout renderer
│  └─ sandbox/
│     └─ SandboxedHTML.tsx     # Iframe sandbox for Open‑Ended GenUI (HTML/JS)
├─ lib/
│  ├─ copilotkit/
│  │  └─ hooks.ts              # useRenderTool, useCopilotReadable, etc.
│  └─ schema/
│     └─ dashboard.ts          # Declarative dashboard / widget schemas (AG‑UI-style)
└─ prompts/
   └─ copilot/
      ├─ 01_molecules.md
      ├─ 02_tools_and_routes.md
      ├─ 03_canvas_and_state.md
      ├─ 04_tests.md
      ├─ 05_sandboxed_open_ended.md
      └─ 06_refactoring.md
```

In addition, the broader repo (`Ditto190/ag2`) includes:

- **Devcontainer for Generative UI**:  
  `.devcontainer/generative-ui/devcontainer.json` — Python 3.11 + Node 20 devcontainer tailored for GenUI + AG2 experiments (Next.js on 3000, FastAPI on 8000, multi‑provider LLM secrets).

- **AG2 / Agentic Infrastructure** (outside this doc’s scope) that you can integrate as backends or tools for GenUI.

---

## 🧠 Architectural Approach

This workspace is built around a **Hybrid Generative UI Architecture**:

1. **Static GenUI (Component Router)**  
   - Safe, production‑grade UI via a curated component registry (MUI‑style cards, tables, charts).
   - The agent selects components and populates props, not raw DOM.
   - Ideal for dashboards, CRUD tools, reporting views.

2. **Declarative GenUI (Schema → Renderer)**  
   - Agent outputs JSON schemas (layouts, widgets, data bindings).
   - `DashboardRenderer` + `dashboard.ts` turn schemas into React trees.
   - Balances flexibility with control; all layout passes through known primitives.

3. **Open‑Ended GenUI (Sandboxed Canvas)**  
   - For prompts that escape the registry / schema (games, fractal explorers, novel visualizations).
   - HTML/CSS/JS generated into an isolated iframe (`SandboxedHTML`), with:
     - sandbox + strict CSP
     - limited, curated runtime (e.g., React, Tailwind, chart libs) pre‑loaded
     - communication via `postMessage` with a narrow, typed protocol
   - High freedom, but contained blast radius.

All three share a **common state & event model** (AG‑UI style), enabling:

- Chat‑based negotiation of intent (“Chat surface”)
- A persistent generative canvas (“Chat+ surface”)
- Headless hints and suggestions in existing apps (“Chatless surface”) when integrated into other systems

---

## 🧩 Key Features

| Area | Feature | Status |
|------|---------|--------|
| **Core GenUI** | Agentic chat endpoint (CopilotKit + Next.js API route) | 🧪 In progress |
| | Chat+ canvas (`GenerativeCanvas`) | 🧪 In progress |
| **Component Registry** | MUI‑style StatCard, DataTable, ChartCard | 🧪 Prototyping |
| | Dashboard schema & renderer | 🧪 Prototyping |
| **Open‑Ended UI** | Sandboxed HTML iframe with strict isolation | 🧪 Design phase |
| | Prompting for Tailwind‑style HTML/JS generation | 🧪 Design phase |
| **AI Orchestration** | CopilotKit hooks for tools & readable state | ✅ Patterns defined (see docs) |
| | AG‑UI style event & state synchronization | 🧪 Design / spec phase |
| **UX / AI Elements** | Streaming skeletons for generative slots | 🧪 Prototyping (`StreamingSkeleton.tsx`) |
| | Ghost UI, suggestion chips for next actions | 🧪 Planned |
| **Evaluation** | PAGEN‑style GenUI benchmark prompts | 🧪 Planned |
| | Human / LLM‑judge ELO scoring | 🧪 Planned |

---

## 🚀 Quick Start (Conceptual)

> Exact commands will depend on how you instantiate `genui-starter/`, but the flow is:

1. **Open Devcontainer (Optional but Recommended)**  
   Use `.devcontainer/generative-ui/devcontainer.json` in `Ditto190/ag2` to get:
   - Node 20
   - VS Code extensions for TS/React/Tailwind
   - Auto‑forwarded ports: 3000 (Next.js), 8000 (backend/LLM if needed)

2. **Install Frontend Dependencies**

```bash
# From genui-starter root
pnpm install   # or npm/yarn
```

1. **Configure LLM / CopilotKit Backend**

- Point `app/api/chat/route.ts` to your LLM provider(s) and CopilotKit runtime.
- Wire in prompts from `prompts/copilot/*.md` (molecules, tools, canvas, sandbox).

1. **Run the Dev Server**

```bash
pnpm dev
# Next.js app at http://localhost:3000
```

1. **Try a GenUI Conversation**

- Open the app.
- In chat, ask:  
  > “Create a sales KPI dashboard with three stat cards and a table of top customers.”
- Watch the agent:
  - Interpret intent
  - Call registry tools (StatCard, DataTable)
  - Render into chat and/or the `GenerativeCanvas`

---

## 🎓 Usage Patterns

### 1. Static GenUI (Component Registry)

Use when you want **reliable, branded, testable** UI.

- Tools map directly to registry components:
  - `render_stat_card`
  - `render_chart_card`
  - `render_data_table`
- Zod schemas + CopilotKit hooks enforce types and prevent hallucinated props.
- Good for:
  - KPI dashboards
  - CRUD views
  - Standard reporting UIs

### 2. Declarative GenUI (Dashboard Schemas)

Use when you want **flexible layouts** from structured definitions.

- Agent emits a JSON schema defined in `lib/schema/dashboard.ts`, e.g.:

```jsonc
{
  "layout": "3-column",
  "widgets": [
    { "type": "stat", "title": "MRR", "value": 120000 },
    { "type": "chart", "kind": "line", "metric": "Revenue" },
    { "type": "table", "source": "top_customers" }
  ]
}
```

- `DashboardRenderer` translates this to a MUI Grid of registry components.

### 3. Open‑Ended GenUI (SandboxedHTML)

Use when the user asks for something outside your registry/schema vocabulary.

- Examples:
  - “Build a fractal explorer where I can zoom with the mouse wheel.”
  - “Make a small game to teach binary numbers.”

- Flow:
  1. Agent uses open‑ended HTML/JS generation prompt (see `05_sandboxed_open_ended.md`).
  2. Output is rendered inside `SandboxedHTML`:
     - iframe with `sandbox` + CSP
     - no access to parent window or cookies
     - only pre‑approved libs available
  3. `postMessage` used for controlled communication (resize, events, analytics).

---

## 🔐 Safety, Security & Control

Generative UI has real risks: broken UX, hallucinated data, XSS. This workspace is architected with layered defenses:

- **Component Registry**: Most UIs are built from audited, testable registry components.
- **Schemas & Validation**:
  - Zod schemas define the contract between agent and UI.
  - Invalid tool calls are rejected before rendering.
- **Sandboxing**:
  - All open‑ended HTML/JS is isolated in an iframe with strict sandbox attributes and CSP.
  - Only curated libraries and assets allowed in the sandbox.
  - Communication limited to a typed `postMessage` protocol.
- **Fact Verification & Metadata (planned)**:
  - Agents instructed to fetch data via tools / RAG, not from stale training data.
  - UIs can show “source metadata” (e.g., URL, query) for critical numbers.

---

## 🧱 Tech Stack

### Frontend & Orchestration

- **Next.js (App Router)** — Streaming, server components, edge runtimes.
- **React 18+** — Component model, Suspense, concurrent rendering.
- **CopilotKit** — Agent orchestration, generative UI hooks, Chat+ integration.
- **TypeScript** — Strong typing across tools, schemas, and components.
- **MUI (Material UI)** — Accessible, themeable primitives for the component registry.
- **(Optional) Tailwind CSS** — For open‑ended sandboxed UIs.

### Agentic & Backend

- **LLMs** — Gemini / OpenAI / Anthropic / others, wired via CopilotKit / AG2 style runtimes.
- **Node / Edge Runtime** — For low‑latency orchestration and streaming.

---

## 🚧 Current Status & Next Steps

### ✅ Established

- Architecture for:
  - Static vs Declarative vs Open‑Ended GenUI
  - Chat+ surface (chat + canvas)
  - Sandbox and security model
- Conceptual component registry design (StatCard, DataTable, ChartCard)
- Prompt sets for molecules, tools, routes, canvas, testing, sandboxing

### 🧪 In Progress

- Implementing the initial GenUI starter (Next.js app + CopilotKit + registry)
- Wiring prompts into the CopilotKit runtime
- Implementing `StreamingSkeleton` and streaming UX patterns

### 🔜 Planned

1. **Registry Expansion**  
   - Add more molecules (filters, multi‑step wizards, timelines)
   - Harden DataTable and ChartCard for real datasets

2. **State & AG‑UI Integration**  
   - Implement `useCopilotReadable` across key components
   - Define a minimal AG‑UI event/state protocol for canvas interactions

3. **Open‑Ended Engine**  
   - Finalize sandbox runtime (curated libs, CSP, postMessage protocol)
   - Add self‑healing loop for runtime errors in generated code

4. **Evaluation & Benchmarks**  
   - Create a domain‑specific PAGEN‑style prompt suite
   - Establish GenUI ELO scoring with human / LLM judges

---

## 🤔 Why This Workspace?

Traditional UI workspaces are about **designing fixed screens**.  
This workspace is about **designing the system that designs the screens**.

Use it to:

- Prototype new GenUI patterns (Chat+, Ghost UI, AG‑UI)
- Experiment with mixing safe static components and wild open‑ended canvases
- Build a reusable blueprint that you can transplant into consulting projects, internal tools, or data apps that need “on‑demand” interfaces.

---

**Next step:**  
Open the GenUI starter, wire up the chat route with your LLM, and implement the first end‑to‑end flow:

> “Generate a three‑card KPI summary and a table for my sample dataset.”

From there, evolve the registry, schema, and sandbox — you’re building the **Agentic Interface layer** for your future apps.
