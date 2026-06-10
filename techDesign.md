# 技术设计文档：个人思考成长平台

**版本**: v1.0 Draft
**日期**: 2026-06-11
**配套文档**: 《PRD-个人思考成长平台》

---

## 1. 总体架构

### 1.1 设计约束

- 单用户、自托管（本地 Mac mini / 个人服务器均可），无多租户。
- 必须有**常驻进程**（cron 调度），排除纯 Serverless。
- AI 全部走外部 API（OpenAI 兼容协议），本机不跑推理（但可把本地推理服务作为一个 Provider 接入）。
- AI 生成的脚本是**不可信代码**，执行必须隔离。

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Web 前端 (React SPA)                  │
│   仪表盘 │ 阶段管理 │ 笔记 │ 脚本管理 │ 系统配置 │ 考试作答    │
└────────────────────────┬────────────────────────────────┘
                         │ REST API + SSE(AI 流式输出)
┌────────────────────────┴────────────────────────────────┐
│                  API Server (FastAPI)                     │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────────┐  │
│  │ Goal/Task │ │ Exam     │ │ Note    │ │ Script/Cron │  │
│  │ Service   │ │ Service  │ │ Service │ │ Service     │  │
│  └──────────┘ └────┬─────┘ └─────────┘ └──────┬──────┘  │
│                    │                           │          │
│  ┌─────────────────┴───────────┐  ┌───────────┴───────┐  │
│  │  AI Gateway（统一 LLM 网关）   │  │ Scheduler(APSched.)│ │
│  │  Provider 路由/模板渲染/      │  │ + Job Queue        │ │
│  │  结构化输出校验/重试/用量统计   │  └───────────┬───────┘ │
│  └─────────────────┬───────────┘              │          │
└────────────────────┼──────────────────────────┼──────────┘
                     │                          │
          ┌──────────┴─────────┐    ┌───────────┴──────────┐
          │ LLM Providers       │    │  脚本沙箱 Runner       │
          │ OpenAI/DeepSeek/    │    │  (Docker 容器,         │
          │ 本地推理服务...      │    │   资源/网络/超时受限)   │
          └────────────────────┘    └──────────────────────┘

           存储：SQLite (WAL) + 本地文件系统（脚本产物/导出）
```

### 1.3 进程模型

单机三个进程，docker-compose 一键拉起：

1. **app**：FastAPI（API + 静态前端托管）+ APScheduler（同进程内调度，单用户负载极低）。
2. **runner**：脚本执行守护进程，从 SQLite 任务表轮询待执行 job，为每个 job 启动一次性 Docker 容器。
3. **(可选) caddy**：HTTPS 反代，远程访问时使用（配合 Tailscale 可省略）。

---

## 2. 技术选型（ADR 摘要）

### ADR-1：后端框架 — FastAPI (Python)

| 维度 | FastAPI + Python | Next.js 全栈 (Node) |
|------|------------------|---------------------|
| AI 生态 | 优（脚本生成的目标语言也是 Python，生态统一） | 中 |
| 定时调度 | APScheduler 成熟 | node-cron 可用但弱 |
| 类型与校验 | Pydantic 天然适合 LLM 结构化输出校验 | Zod 可用 |
| 开发者熟悉度 | 高（用户 Python/ML 背景） | 中 |

**决定**：FastAPI。AI 生成脚本目标语言为 Python，后端同语言可复用依赖管理与校验逻辑；Pydantic 模型直接充当 LLM JSON 输出的 schema 校验器。

### ADR-2：数据库 — SQLite（WAL 模式）

单用户、单机、数据量级 < 10⁶ 行，PostgreSQL 是过度设计。SQLite + FTS5 同时解决存储与全文搜索（笔记检索）。备份即复制文件，符合"个人系统数据自持"理念。**预留迁移路径**：ORM 用 SQLAlchemy，未来如需多端同步可平移到 Postgres。

### ADR-3：前端 — React + Vite + TypeScript

SPA 即可（无 SEO 需求）。组件库 shadcn/ui + Tailwind；Markdown 编辑器用 CodeMirror 6 + 渲染层（markdown-it + KaTeX + Shiki 代码高亮）；图表用 Recharts（热力图、趋势）。

### ADR-4：脚本沙箱 — 一次性 Docker 容器

| 方案 | 隔离性 | 复杂度 | 结论 |
|------|--------|--------|------|
| 直接 subprocess | 无 | 低 | ❌ 不可接受（AI 代码可任意读写宿主机） |
| Python RestrictedPython | 弱（可逃逸） | 中 | ❌ |
| 一次性 Docker 容器 | 强 | 中 | ✅ 采用 |
| gVisor/Firecracker | 最强 | 高 | 过度，P2 |

容器约束：`--network` 仅允许出站 HTTP(S)（按需可配域名白名单的代理）、`--memory 512m`、`--cpus 1`、`--read-only` 根文件系统 + 唯一可写挂载 `/workspace`（产物目录）、`--pids-limit 128`、超时强杀（默认 300s）。镜像预装 requests/bs4/pandas/feedparser 等常用采集依赖，脚本可声明额外依赖（构建时审阅）。

### ADR-5：调度 — APScheduler（而非 Celery/Redis）

单用户每天几十个 job，Celery + Redis 是杀鸡用牛刀。APScheduler 的 `SQLAlchemyJobStore` 持久化到同一个 SQLite，进程重启后任务不丢。**注意**：APScheduler 只负责"到点把 job 写入执行队列表"，实际执行由 runner 进程消费——调度与执行解耦，避免长任务阻塞调度器。

---

## 3. 数据模型

### 3.1 ER 概览

```
Goal 1──n StageTask 1──n SubTask
              │ 1                     
              ├──n Exam 1──n ExamQuestion 1──1 ExamAnswer
              │
Goal/Task ───n Note（可空关联，独立笔记不关联）
Goal/Task ───n Script 1──n ScriptRun
AIProvider ──n（场景路由表）
PromptTemplate（按场景 scene 区分）
```

### 3.2 核心表定义（节选）

```sql
CREATE TABLE goal (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  priority      TEXT CHECK(priority IN ('P0','P1','P2')) DEFAULT 'P1',
  status        TEXT CHECK(status IN ('pending','active','done','archived')) DEFAULT 'pending',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME
);

CREATE TABLE stage_task (
  id              INTEGER PRIMARY KEY,
  goal_id         INTEGER NOT NULL REFERENCES goal(id),
  title           TEXT NOT NULL,
  objective       TEXT NOT NULL,            -- 任务目标内容（喂给 AI 的核心输入）
  start_date      DATE, end_date DATE,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending|in_progress|exam_pending|exam_in_progress|evaluating|passed|delayed|force_closed
  progress        REAL DEFAULT 0,           -- 0~1，按子任务计算，可手动校准
  exam_config     JSON,                     -- {prompt_template_id, question_count, pass_score, max_delays}
  delay_count     INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sub_task (
  id              INTEGER PRIMARY KEY,
  stage_task_id   INTEGER NOT NULL REFERENCES stage_task(id),
  title           TEXT NOT NULL,
  content         TEXT,                     -- 学习内容说明
  knowledge_tags  JSON,                     -- ["匈牙利算法","二分图匹配"] 错题映射的关键
  order_index     INTEGER,
  est_hours       REAL,
  status          TEXT NOT NULL DEFAULT 'todo',
  -- todo|doing|done|mastered|weak    mastered/weak 由考试结果写入
  origin          TEXT DEFAULT 'ai',        -- ai|manual|redecompose
  round           INTEGER DEFAULT 1,        -- 第几轮拆解产生（重拆解递增）
  locked          BOOLEAN DEFAULT 0,        -- mastered 后锁定，重拆解不可删
  done_at         DATETIME
);

CREATE TABLE exam (
  id              INTEGER PRIMARY KEY,
  stage_task_id   INTEGER NOT NULL REFERENCES stage_task(id),
  round           INTEGER NOT NULL,         -- 第几次考试（与 delay 对应）
  status          TEXT DEFAULT 'generated', -- generated|in_progress|evaluating|evaluated|failed
  gen_prompt_snapshot TEXT,                 -- 出题时实际使用的完整 prompt（可追溯）
  total_score     REAL, pass_score REAL,
  passed          BOOLEAN,
  ai_summary      TEXT,                     -- 总体评语 + 薄弱知识点 JSON
  human_reviewed  BOOLEAN DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exam_question (
  id            INTEGER PRIMARY KEY,
  exam_id       INTEGER NOT NULL REFERENCES exam(id),
  qtype         TEXT,        -- single|multi|short_answer|code
  question      TEXT NOT NULL,
  options       JSON,        -- 选择题选项
  rubric        TEXT NOT NULL,  -- 评分标准，与题目同时生成并固化 ★
  knowledge_tags JSON,
  max_score     REAL NOT NULL,
  answer_text   TEXT,        -- 用户作答
  ai_score      REAL, ai_feedback TEXT,
  human_score   REAL,        -- 人工复核分（非空则覆盖 ai_score）
  override_reason TEXT
);

CREATE TABLE note (
  id            INTEGER PRIMARY KEY,
  title         TEXT, content TEXT,         -- Markdown
  goal_id       INTEGER REFERENCES goal(id),       -- 三级关联均可空 → 独立笔记
  stage_task_id INTEGER REFERENCES stage_task(id),
  sub_task_id   INTEGER REFERENCES sub_task(id),
  tags          JSON,
  deleted_at    DATETIME,                   -- 软删除
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME
);
CREATE VIRTUAL TABLE note_fts USING fts5(title, content, content='note', content_rowid='id');

CREATE TABLE script (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  goal_id       INTEGER REFERENCES goal(id),        -- 空 = 独立脚本
  stage_task_id INTEGER REFERENCES stage_task(id),
  requirement   TEXT,                       -- 用户的自然语言需求
  code          TEXT NOT NULL,              -- 当前版本 Python 代码
  version       INTEGER DEFAULT 1,
  cron_expr     TEXT,                       -- 空 = 仅手动触发
  enabled       BOOLEAN DEFAULT 0,
  post_prompt_template_id INTEGER,          -- P1: 输出后处理
  timeout_sec   INTEGER DEFAULT 300,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE script_version (script_id, version, code, created_at);  -- 版本历史

CREATE TABLE script_run (
  id          INTEGER PRIMARY KEY,
  script_id   INTEGER NOT NULL REFERENCES script(id),
  trigger     TEXT,        -- cron|manual|test
  status      TEXT,        -- queued|running|success|failed|timeout
  started_at  DATETIME, finished_at DATETIME,
  stdout      TEXT, stderr TEXT,
  artifacts   JSON         -- /workspace 产物文件清单与存档路径
);

CREATE TABLE ai_provider (
  id        INTEGER PRIMARY KEY,
  name      TEXT, base_url TEXT NOT NULL,
  api_key_enc BLOB NOT NULL,               -- AES-GCM 加密，主密钥来自环境变量
  default_model TEXT,
  is_default BOOLEAN DEFAULT 0
);
CREATE TABLE ai_scene_route (              -- 分场景模型路由
  scene     TEXT PRIMARY KEY,              -- decompose|exam_gen|exam_eval|script_gen|note_assist
  provider_id INTEGER REFERENCES ai_provider(id),
  model     TEXT, temperature REAL
);

CREATE TABLE prompt_template (
  id        INTEGER PRIMARY KEY,
  scene     TEXT NOT NULL,
  name      TEXT, is_builtin BOOLEAN DEFAULT 0,
  content   TEXT NOT NULL                  -- 含 {{变量}} 插值
);
```

### 3.3 关键索引

`stage_task(goal_id, status)`、`sub_task(stage_task_id, round)`、`exam_question(exam_id)`、`note(goal_id), note(stage_task_id)`、`script_run(script_id, started_at DESC)`。

---

## 4. 核心机制设计

### 4.1 阶段任务状态机（系统核心）

```
                    ┌────────────────────────────────────┐
                    │            (delay 重拆解后)          │
                    ▼                                    │
 pending ──► in_progress ──► exam_pending ──► exam_in_progress
                 ▲   (到期/手动)      (开始作答)        │ (提交)
                 │                                      ▼
                 │            未达标&确认delay      evaluating
                 └────────── delayed ◄───────────────┤ (AI评分±人工复核)
                                                     │ 达标
                              (达到max_delays        ▼
                               用户强制) ──────►  passed / force_closed  [终态]
```

转移规则要点：

- `in_progress → exam_pending`：定时器扫描到期任务，或用户手动触发；子任务未全完成时弹确认（直接考 or 先延期）。
- `evaluating → passed`：`total_score ≥ pass_score`（人工复核分优先于 AI 分参与计算）。
- `evaluating → delayed`：不达标 → 生成重拆解 diff → 用户确认延期时长与 diff → 应用后回到 `in_progress`，`delay_count += 1`，`round += 1`。
- 终态 `passed/force_closed`：子任务与考试记录转只读。
- 所有状态转移写入 `task_event` 审计表（时间、原因、关联考试），仪表盘的 delay 趋势从此表统计。

### 4.2 增量重拆解算法（"答对保留，薄弱加强"）

```
输入: 
  S  = 当前轮子任务列表(含 knowledge_tags, status)
  W  = 本次考试错题列表(含 knowledge_tags, 失分, AI 错因分析)
  C  = 本次考试答对题的 knowledge_tags 集合

步骤:
1. 标记掌握: 对每个子任务 s ∈ S:
     若 s.tags ⊆ C 且 s.tags ∩ tags(W) = ∅ → s.status = mastered, s.locked = true
     若 s.tags ∩ tags(W) ≠ ∅            → s.status = weak (保留, 不删除)
2. 调用 LLM(scene=decompose, 模板=redecompose):
     注入: 任务目标 + S(含状态) + W(错题原文+错因) + 用户相关笔记摘要
     约束(写死在系统 prompt): 不得删除或修改 mastered 子任务;
     必须为每个错题 tag 产出 ≥1 个强化子任务; 可补充遗漏知识点
     输出 JSON: { reinforce: [...], new: [...], rationale: ... }
3. 服务端校验(Pydantic):
     - mastered 集合在输出中未被改动(违反则拒绝并重试, 最多 2 次)
     - 每个错题 tag 被 ≥1 个新子任务覆盖(缺失则二次补全调用)
4. 以 diff 形式呈现给用户(保留🔒/强化⚠️/新增➕), 确认后写库:
     新子任务 round = 当前 round+1, origin = 'redecompose'
```

掌握状态判定依赖 **knowledge_tags 的一致性**——出题 prompt 强制要求每道题标注其考察的子任务知识点 tag（从子任务表注入候选 tag 列表，LLM 只能从中选择，避免 tag 漂移导致映射失败）。

### 4.3 考试流水线

```
触发 ──► 渲染出题 prompt(模板+变量: objective/subtasks+tags/历史错题/笔记摘要)
     ──► LLM 生成 (JSON: questions[] 含 rubric ★同时生成并固化)
     ──► Pydantic 校验(题量/必填字段/tag 合法性) 失败→重试(temperature 降低)
     ──► 入库 status=generated ──► 用户作答(草稿自动保存)──► 提交
     ──► 逐题评估: 每题单独一次 LLM 调用(题目+rubric+作答 → score+feedback)
         · 选择题不走 LLM, 程序直接比对 ★省 token 且零误差
         · 单题调用失败可独立重试, 不影响其他题
     ──► 汇总: 总分/通过判定/薄弱 tag 聚合 ──► status=evaluated
     ──► 用户可逐题申请人工复核改分 → 重算通过状态
```

设计理由：**逐题独立评估**而非整卷一次评估——上下文更短判分更稳、失败粒度小、便于并发；rubric 在出题时固化，评估阶段 LLM 不重新解释题意，判分一致性显著提高。

### 4.4 AI Gateway（统一 LLM 网关）

```python
class AIGateway:
    async def call(self, scene: Scene, variables: dict,
                   response_model: Type[BaseModel]) -> BaseModel:
        route   = self.routes[scene]              # provider+model+temperature
        prompt  = render(template_for(scene), variables)  # Jinja2 渲染
        for attempt in range(3):
            raw = await openai_compatible_chat(route, prompt)
            try:
                return response_model.model_validate_json(extract_json(raw))
            except ValidationError as e:
                prompt = prompt + repair_hint(e)   # 把校验错误回喂修复
        raise AIStructuredOutputError
```

职责：场景路由、模板渲染、**结构化输出校验 + 自动修复重试**、prompt 快照留档（每次调用的完整 prompt 与原始响应入 `ai_call_log`，用于排查"为什么这么出题/这么判分"）、token 用量统计、SSE 流式透传（拆解/出题过程在前端实时渲染）。

### 4.5 Cron 调度与沙箱执行

```
APScheduler(到点) ──写入──► script_run(status=queued)
                                 │
runner 进程轮询 queued ──► docker run --rm \
                              --network=proxy-net --memory=512m --cpus=1 \
                              --read-only -v {run_dir}:/workspace \
                              --pids-limit=128 growth-sandbox:latest \
                              timeout 300 python /workspace/script.py
                                 │
                stdout/stderr/产物 ──► 持久化到 script_run + 文件归档
                                 │
                (可选) post_prompt ──► AI Gateway 整理 ──► 结果存为"采集产出"
                                 │
                              仪表盘"今日产出"卡片
```

安全要点：

1. **网络**：容器不直连外网，经一个 squid/mitmproxy 出口代理，默认放行 HTTP(S)，可按脚本配置域名白名单；禁止访问宿主内网段（防 SSRF 打到 API Server 自己）。
2. **密钥隔离**：沙箱内**不注入** AI API Key 与数据库——脚本只做"取数与产出文件"，AI 后处理在沙箱外由 Gateway 完成。
3. **测试运行 = 正式运行**：同一容器路径，仅 `trigger='test'` 标记区分，保证"测试通过则上线行为一致"。
4. 容器镜像固定 tag，依赖变更需重建镜像并人工确认（防 AI 生成代码自带 `pip install` 拉取任意包）。

### 4.6 API Key 加密

`api_key_enc` 用 AES-256-GCM 加密存储，主密钥 `MASTER_KEY` 仅存在于环境变量/`.env`（不入库、不入版本控制）。API 返回值永远是 `sk-***1a2b` 掩码；前端"编辑"语义为整体替换。

---

## 5. API 设计（REST，节选）

```
GET/POST/PATCH        /api/goals, /api/goals/{id}
GET/POST/PATCH        /api/goals/{id}/tasks, /api/tasks/{id}
POST  /api/tasks/{id}/decompose          # AI 拆解 → 返回草稿(SSE 流式)
POST  /api/tasks/{id}/subtasks:confirm   # 确认草稿写入
PATCH /api/subtasks/{id}                 # 状态/排序/编辑
POST  /api/tasks/{id}/exam               # 触发出题
GET   /api/exams/{id}                    # 题目与作答状态
PUT   /api/exams/{id}/answers            # 保存草稿/提交
POST  /api/exams/{id}/evaluate           # 触发评估
POST  /api/questions/{id}/override       # 人工复核改分
POST  /api/exams/{id}/redecompose        # 生成重拆解 diff
POST  /api/exams/{id}/redecompose:apply  # 确认 diff + 延期时长

GET/POST/PATCH /api/notes  (?goal_id=&task_id=&q=全文搜索&tag=)
GET/POST/PATCH /api/scripts, /api/scripts/{id}
POST  /api/scripts/generate              # 需求 → AI 生成代码草稿
POST  /api/scripts/{id}/run?mode=test    # 测试触发
GET   /api/scripts/{id}/runs             # 运行历史
GET/POST/PATCH /api/settings/providers, /api/settings/routes, /api/settings/templates
POST  /api/settings/providers/{id}/ping  # 连通性测试

GET   /api/dashboard/summary             # 仪表盘聚合(今日聚焦/进度/统计)
GET   /api/dashboard/weak-points         # 薄弱知识点聚合
```

约定：AI 长耗时接口（拆解/出题/评估/脚本生成）一律 SSE 流式或返回 `job_id` 轮询；所有"AI 草稿 → 确认"两段式接口成对出现。

---

## 6. 前端结构

```
/                 仪表盘
/goals            目标列表 → /goals/:id 目标详情(任务列表/统计/笔记/cron)
/tasks/:id        任务详情(子任务看板 + 笔记侧栏 + 考试入口 + 历史)
/exams/:id        考试作答页(Markdown/代码作答, 自动保存) → 成绩与评语页
/notes            笔记列表+全文搜索 → /notes/:id 编辑器
/scripts          脚本统一列表 → /scripts/:id 编辑器+运行日志
/settings         AI Provider / 场景路由 / Prompt 模板
```

状态管理：TanStack Query（服务端状态）+ Zustand（编辑器本地态）。考试作答与笔记编辑均做 5s 防抖自动保存 + `beforeunload` 兜底。

---

## 7. 非功能需求

| 项 | 要求 |
|----|------|
| 性能 | 仪表盘聚合查询 < 500ms；笔记 FTS 检索万级 < 1s |
| 可靠性 | APScheduler job 持久化，进程重启不丢任务；脚本失败默认重试 2 次（指数退避） |
| 数据安全 | SQLite 每日自动备份（保留 30 份滚动）；API Key 加密；沙箱隔离见 4.5 |
| 可观测 | 结构化日志(loguru)；ai_call_log 记录每次 LLM 调用的 prompt/响应/token/耗时 |
| 部署 | docker-compose 单命令启动；远程访问建议 Tailscale 而非公网暴露 |

## 8. 测试策略（要点）

- **状态机单测全覆盖**：所有合法/非法转移（如 `passed` 后不可再 delay）。
- **重拆解契约测试**：构造"部分错题"考试结果，断言 mastered 子任务在 diff 中不可变、每个错题 tag 有覆盖。
- **LLM 层用录制回放**（固定 mock 响应）测校验与修复重试逻辑，不依赖真实 API。
- **沙箱红队用例**：让脚本尝试读 `/etc/passwd`、连内网、fork 炸弹、超时死循环，断言全部被拦截。

## 9. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| AI 评估主观题判分不稳定 → delay 循环挫败 | 高 | rubric 固化 + 逐题评估 + 人工 override + max_delays 逃生门 |
| AI 生成脚本恶意/低质代码 | 高 | 强制沙箱 + 人工审阅后才能启用 + 依赖白名单镜像 |
| knowledge_tag 漂移导致错题无法映射子任务 | 中 | 出题时 tag 限定从子任务表候选集中选择；校验失败二次补全 |
| LLM 结构化输出格式不稳 | 中 | Pydantic 校验 + 错误回喂修复重试（最多 3 次）+ 失败可人工编辑 JSON |
| 目标网站反爬导致 cronjob 持续失败 | 中 | 失败告警上仪表盘；v1 限定公开数据源（RSS/API/静态页优先） |
| 单文件 SQLite 损坏 | 低 | WAL + 每日备份 + 导出 JSON 功能 |

## 10. 实施计划（与 PRD 里程碑对齐）

| 周次 | 内容 |
|------|------|
| W1–2 | 项目脚手架、数据模型、Goal/Task/SubTask CRUD、AI Gateway + Provider 配置 |
| W3–4 | AI 拆解（草稿确认流）、任务状态机、考试生成/作答/逐题评估 |
| W5 | delay + 增量重拆解 diff、人工复核 —— **M1 闭环验收** |
| W6–7 | APScheduler + runner + Docker 沙箱、脚本生成/测试运行/版本管理 —— **M2** |
| W8–9 | 笔记（编辑器/FTS/上下文关联）、仪表盘统计与薄弱点聚合、错题本 —— **M3** |
| W10 | 备份/导出、打磨与红队测试 |
