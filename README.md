# MindPalace · 思维宫殿

A personal growth operating system — a **mastery learning platform** where tasks close only after AI-verified exam passage, not by ticking a clock.

## Architecture

```
React 18 SPA (Vite + TypeScript + Tailwind)
       │ REST + SSE(streaming)
FastAPI (Python) + SQLAlchemy + SQLite (WAL)
       │
   ┌───┴─────┐
  AI Gateway  APScheduler (M2)
  (OpenAI/    Cronjob runner
  DeepSeek/   + Docker sandbox)
  local LLM)
```

## Quick Start

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# → http://localhost:8000 | API docs: http://localhost:8000/docs

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173 (proxies /api → localhost:8000)

# One-shot
./start.sh
```

## Feature Status

### M1 — Core Mastery Loop (complete)

| Feature | Description |
|---------|-------------|
| Goal / StageTask / SubTask CRUD | 3-level hierarchy with progress tracking |
| AI Task Decomposition | LLM breaks objectives into sequenced subtasks, draft → review → confirm |
| AI Exam Generation | Rubric co-generated and frozen at creation time |
| AI Exam Evaluation | Per-question scoring; auto-grade for MCQs; rubric-based for open-ended |
| Human Override | Per-question manual score adjustment with audit trail |
| Incremental Redecomposition | After failed exam: mastered subtasks preserved, weak areas reinforced via diff |
| Notes (Markdown) | Goal/task/subtask context-linked notes with search |
| FTS5 Full-Text Search | Notes search via SQLite FTS5 virtual table (<1s on 10k records) |
| Wrong-Question Book | Cross-task aggregated wrong answers, filterable by knowledge tag |
| Dashboard | Active goals, progress, due-today tasks, weak-point aggregation |
| AI Config | Multi-provider (OpenAI/DeepSeek/local), per-scene routing, editable prompt templates |

### M2 — Automation (in progress)

| Feature | Status |
|---------|--------|
| APScheduler job scheduling | Models & API scaffold ready |
| Docker sandbox runner | Script/ScriptRun tables ready |
| AI script generation | Prompt template seeded |
| Script test-run | CLI handler pending |
| Script management UI | Pending |

### M3 — Knowledge Accumulation (in progress)

| Feature | Status |
|---------|--------|
| FTS5 full-text search | ✅ Complete |
| Wrong-question book | ✅ Complete |
| Weekly report | ✅ Complete |
| Learning heatmap | ✅ Complete |
| Note version history | Pending |
| Data export/import | Pending |

### API Endpoints Added (M3)

| Endpoint | Description |
|----------|-------------|
| `GET /api/notes?q=...` | FTS5 full-text search (was SQL LIKE) |
| `GET /api/wrongbook` | List wrong questions, filter by tag/reviewed |
| `PATCH /api/wrongbook/{id}` | Mark wrong question as reviewed |
| `GET /api/wrongbook/tags` | Knowledge tag distribution in wrong book |
| `GET /api/wrongbook/stats` | Total/reviewed/unreviewed counts |
| `GET /api/dashboard/heatmap?days=30` | Daily activity counts for heatmap |
| `GET /api/dashboard/weekly-report` | This week's stats and weak points |

## Database

SQLite with WAL mode. All tables via SQLAlchemy ORM. Tables:

- `goal` — top-level goals with date ranges and priorities
- `stage_task` — exam-gated learning tasks with status state machine
- `sub_task` — actionable subtasks with knowledge tags, mastery status, and lock flags
- `exam` / `exam_question` — exams with frozen rubrics, per-question AI/human scores
- `note` / `note_fts` — Markdown notes with FTS5 full-text index, 3-level context links, soft-delete
- `ai_provider` / `ai_scene_route` / `prompt_template` — LLM config with encrypted API keys
- `script` / `script_run` — cronjob definitions and execution history (M2)
- `wrong_question_book` — cross-task aggregated wrong questions with review tracking
- `learning_activity` — daily activity counter for heatmap and weekly report
- `job_application` — job applications with 8-state pipeline, scores, tags, and notes
- `pipeline_item` — URL inbox entries pending AI processing
- `career_config` — key-value career profile and portal scanner settings

## Environment Variables

Set in `backend/.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `MASTER_KEY` | `change-me...` | AES-256 key for API key encryption; **change in production** |
| `OPENAI_API_KEY` | — | Your LLM provider key (configure in-app via Settings UI) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Change for DeepSeek / local LLM |
| `DEFAULT_MODEL` | `gpt-4o` | Fallback model |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated |

## Design Decisions

- **AI output = draft + human confirm** — No AI output auto-commits; user reviews before it takes effect.
- **Exam pass = only exit** — Tasks can't auto-complete by deadline. Pass or get delayed with targeted reinforcement.
- **Redecomposition is a diff, not a wipe** — Mastered subtasks preserved and locked; only weak areas get new tasks.
- **Scripts run in Docker sandbox** (M2) — AI-generated code never touches the host filesystem.
- **Rubrics frozen at generation time** — Exam scoring uses the rubric generated with the questions, preventing LLM drift.

## Recent Optimizations

### Backend
- **Request ID middleware** — `X-Request-ID` injected/forwarded for per-request log correlation
- **Pydantic schema validation** — `@model_validator` checks on `GoalCreate`/`StageTaskCreate` (end_date ≥ start_date, max_delays ≥ 0)
- **Database indexes** — Composite indexes on `stage_task(goal_id,status)`, `sub_task(stage_task_id,round)`, and 9 other hot query paths
- **Cleaned dependencies** — Removed unused `python-jose`/`passlib`/`aiofiles`; added explicit `aiosqlite`
- **Fixed `__import__('datetime')` anti-patterns** — Replaced with proper module-level imports

### Frontend
- **Split monolithic App.tsx** → 7 page modules + 3 shared components (ErrorBoundary, Theme, Toast)
- **TanStack Query** — Server-state management with stale-while-revalidate, dedup, and retry
- **AbortController timeouts** — 30s default, 120s for AI operations; clean error propagation
- **Error boundary** — Catches unhandled render exceptions per-route with retry button
- **API completeness** — Added `heatmap`, `weekly-report`, and `wrongbook` client endpoints
- **Component isolation** — `useToast()` / `useTheme()` contexts extracted from inline logic

### Code Quality
- **Shared `utils.ts`** — Eliminated 8× duplicated `formatDate`/`today`/`ViewProps` definitions across all page modules
- **Skill-based design audit** — Reviewed against `design-taste-frontend` + `clean-code` + `react-best-practices`: confirmed consistent card radius, CSS variable palette, dark mode coverage, responsive breakpoints, label-above-input form pattern, and <200-line file discipline



## License

Personal project — no license.
