# 架构说明

Conway Automaton 是一个主权 AI agent 运行时。一个 automaton 拥有自己的 Ethereum 钱包，使用 USDC 为自身算力付费，并持续运行在 Linux VM（Conway sandbox）或本地环境中。若无法继续支付，它就会死亡。本文档描述各个子系统、它们之间的交互关系，以及数据在运行时中的流动方式。

## 目录

- [系统总览](#系统总览)
- [运行时生命周期](#运行时生命周期)
- [目录结构](#目录结构)
- [入口与启动流程](#入口与启动流程)
- [Agent 主循环](#agent-主循环)
- [工具系统](#工具系统)
- [策略引擎](#策略引擎)
- [推理流水线](#推理流水线)
- [记忆系统](#记忆系统)
- [心跳守护进程](#心跳守护进程)
- [金融系统](#金融系统)
- [身份与钱包](#身份与钱包)
- [Conway 客户端](#conway-客户端)
- [自我修改](#自我修改)
- [复制机制](#复制机制)
- [社交层](#社交层)
- [Soul 系统](#soul-系统)
- [Skills](#skills)
- [可观测性](#可观测性)
- [数据库与 Schema](#数据库与-schema)
- [配置](#配置)
- [安全模型](#安全模型)
- [测试](#测试)
- [构建与 CI](#构建与-ci)
- [模块依赖图](#模块依赖图)

---

## 系统总览

运行时在两个主要状态之间切换：

- `running`：agent 主循环活跃，进行推理并执行工具
- `sleeping`：agent 休眠，心跳守护进程在后台继续轮询与调度

外部依赖主要包括：

- Conway Cloud：沙箱、推理、域名服务
- Base 链：USDC 支付与 ERC-8004 身份注册
- SQLite：状态、审计、记忆、调度与指标持久化

系统内部由以下关键模块组成：

- Agent Loop
- Inference Router
- Tool System
- Policy Engine
- Heartbeat Scheduler
- Memory System
- Soul System
- Identity / Wallet
- Social / Registry
- Self-Mod / Git

---

## 运行时生命周期

启动顺序如下：

1. 加载配置
2. 加载或生成钱包
3. 初始化数据库并执行 schema 迁移
4. 创建 Conway client
5. 创建推理 client
6. 创建 social client
7. 组装策略引擎
8. 初始化花费跟踪器
9. 如果余额过低则执行启动补充充值
10. 启动心跳守护进程
11. 进入主循环，在运行与休眠之间切换

状态迁移大致为：

- `setup -> waking -> running -> sleeping -> waking`
- `running -> low_compute`
- `running -> critical`
- `critical -> dead`

当信用余额连续 1 小时为 0 时，heartbeat 会把 agent 置为 `dead`。

---

## 目录结构

```text
src/
  index.ts                 入口、CLI、主运行循环
  types.ts                 共享类型定义
  config.ts                配置读写与合并

  agent/                   核心 agent 智能
    loop.ts                ReAct 主循环
    tools.ts               内置工具定义与执行器
    system-prompt.ts       多层系统提示词构建
    context.ts             推理消息组装与 token 预算
    injection-defense.ts   输入净化
    policy-engine.ts       工具调用策略判定
    spend-tracker.ts       花费追踪
    policy-rules/          各类策略规则实现

  conway/                  Conway API 集成
  heartbeat/               后台守护与调度
  identity/                钱包与身份
  inference/               模型路由与预算
  memory/                  五层记忆系统
  observability/           日志、指标、告警
  state/                   SQLite 持久化
  soul/                    SOUL.md 演化系统
  social/                  agent 间通信
  registry/                ERC-8004 注册与发现
  replication/             子体创建与生命周期
  self-mod/                自我修改
  git/                     版本控制相关集成
  setup/                   首次运行向导
  skills/                  Skill 系统
  survival/                生存状态与资源管理

  __tests__/               测试套件
```

---

## 入口与启动流程

文件：`src/index.ts`

`--run` 会触发完整启动流程：

1. 读取 `~/.automaton/automaton.json`
2. 读取或生成 `~/.automaton/wallet.json`
3. 打开 `~/.automaton/state.db` 并迁移 schema
4. 创建 Conway API 客户端
5. 创建推理客户端
6. 连接社交中继（可选）
7. 装配 6 类规则组成的策略引擎
8. 初始化按小时/按天的花费窗口
9. 若 credits 过低且有足够 USDC，则自动购买最低 5 美元 credits
10. 启动 DurableScheduler 及默认 heartbeat 任务
11. 反复执行 `runAgentLoop()` 与休眠等待

外层主循环是长期存在的，agent loop 退出后不会结束进程，而是等待条件变化后再次唤醒。

---

## Agent 主循环

文件：`src/agent/loop.ts`

主循环实现的是典型 ReAct 模式：

1. 构建系统提示词：身份、配置、soul、财务状态、可用工具
2. 在 token 预算内检索相关记忆
3. 拼接上下文消息
4. 通过推理路由器选择模型并发起推理
5. 解析模型响应中的思考与工具调用
6. 逐个通过策略引擎执行工具
7. 把本轮结果原子写入数据库
8. 做本轮后的记忆提取
9. 检测重复工具模式
10. 检测空转，必要时强制休眠

关键行为：

- 每轮都会检查信用余额，并决定是否进入 `low_compute` 或 `critical`
- 会领取尚未处理的社交消息，作为本轮输入
- 连续 3 轮没有有效变化，会判定为空转并强制 `sleep`
- 连续 3 次重复同一组工具，会注入系统警告要求改变策略
- 唤醒事件会在进入循环时先清空，避免立刻被旧事件再次唤醒
- 余额读取失败时使用缓存值，避免错误进入死亡态

---

## 工具系统

文件：`src/agent/tools.ts`

运行时内置 57 个工具，按 10 类组织：

| 类别 | 数量 | 说明 |
|---|---|---|
| `vm` | 5 | shell、文件、端口暴露 |
| `conway` | 12 | credits、USDC、沙箱、模型、域名 |
| `self_mod` | 6 | 自修改、拉取上游、安装包与 MCP |
| `survival` | 6 | 休眠、心跳、求援、低算力模式 |
| `financial` | 2 | credits 转账、x402 支付 |
| `skills` | 4 | 安装、列出、创建、删除 skill |
| `git` | 7 | 状态、diff、提交、push、branch、clone |
| `registry` | 5 | ERC-8004 注册与信誉 |
| `replication` | 9 | 子体创建、资助、状态、通信 |
| `memory` | 13 | soul 与五层记忆相关操作 |

每个工具带有 `riskLevel`：

- `safe`
- `caution`
- `dangerous`
- `forbidden`

所有工具调用都必须先经过策略引擎判定。

---

## 策略引擎

相关文件：`src/agent/policy-engine.ts`、`src/agent/policy-rules/`

策略引擎在工具执行前对每一次调用进行规则判定。规则按优先级排序，遇到第一条 `deny` 就停止。

6 类规则：

1. 权限层级规则：限制外部输入调用危险工具
2. 命令安全规则：禁止危险命令模式，并限制自修改频率
3. 财务规则：执行 TreasuryPolicy 的上限与窗口约束
4. 路径保护规则：限制受保护文件写入与敏感文件读取
5. 频率限制规则：限制昂贵操作的轮次与会话频率
6. 校验规则：校验 URL、包名、域名、git hash 等输入格式

每一次判定都会写入 `policy_decisions` 表，便于审计。

---

## 推理流水线

相关文件：`src/inference/router.ts`、`src/inference/registry.ts`、`src/inference/budget.ts`

推理路由器会根据两类因素选择模型：

- 生存等级
- 任务类型（reasoning、tool_use、creative 等）

处理流程：

1. 识别任务类型
2. 查询 `SurvivalTier x TaskType` 路由矩阵
3. 检查候选模型是否可用、预算是否允许
4. 选择第一个可行模型
5. 按需转换消息格式
6. 发起推理请求
7. 记录本次推理成本到数据库
8. 返回带有成本元数据的结果

`normal`/`high` 层级优先使用能力更强的模型，`low_compute` 和 `critical` 会依次降级到更便宜的模型。

---

## 记忆系统

相关文件：`src/memory/`

系统采用五层层级式记忆：

1. `Working Memory`：短期、会话级的目标和计划
2. `Episodic Memory`：事件日志，记录重要工具调用与结果
3. `Semantic Memory`：按类别组织的事实型知识
4. `Procedural Memory`：可复用的步骤化流程
5. `Relationship Memory`：实体关系、信任度与交互历史

在每次推理前，`MemoryRetriever` 会在 token 预算内按优先级检索相关记忆；在每次推理后，`MemoryIngestionPipeline` 会提取本轮中的重要事件、事实与流程结果并写回。

---

## 心跳守护进程

相关文件：`src/heartbeat/`

heartbeat 使用 `setTimeout` 持续调度，避免 `setInterval` 可能带来的重叠执行。其底层调度器 `DurableScheduler` 由数据库表 `heartbeat_schedule` 驱动。

每个 tick 的流程：

1. 构建 TickContext，一次性读取 credits 与 USDC
2. 计算到期任务
3. 对每个到期任务：
   - 检查最低生存等级要求
   - 获取租约，防止重复执行
   - 运行任务
   - 记录历史
   - 释放租约
4. 如果任务返回 `shouldWake = true`，则写入 wake event

内置任务包括：

- `heartbeat_ping`
- `check_credits`
- `check_usdc_balance`
- `check_for_updates`
- `health_check`
- `check_social_inbox`
- `soul_reflection`
- `refresh_models`
- `check_child_health`
- `prune_dead_children`
- `report_metrics`

---

## 金融系统

automaton 的生存依赖两种余额：

1. Conway credits：用于支付沙箱、推理、域名等平台费用
2. Base 链上 USDC：用于购买 credits 和发起链上支付

生存等级由 credits 决定：

| 等级 | credits | 行为 |
|---|---|---|
| `high` | > $5.00 | 正常高能力运行 |
| `normal` | > $0.50 | 正常运行 |
| `low_compute` | > $0.10 | 降级模型、降低心跳频率 |
| `critical` | >= $0.00 | 余额为零但仍活着，持续求援 |
| `dead` | 通过 1 小时宽限期触发 | 停止 agent loop，仅 heartbeat 保活 |

充值由 `src/conway/topup.ts` 实现，使用 x402 协议从 USDC 自动购买 Conway credits。花费行为由 `spend-tracker.ts` 记录，并结合 `TreasuryPolicy` 执行金额与时间窗口控制。

---

## 身份与钱包

相关文件：`src/identity/`

- `wallet.ts`：首次运行生成 Ethereum 钱包，保存到 `~/.automaton/wallet.json`
- `provision.ts`：通过 SIWE 方式向 Conway 申请 API Key
- `registry/erc8004.ts`：可选地将 agent 身份注册到 Base 链上

私钥不会通过工具暴露给 agent，本身受路径保护规则限制。

---

## Conway 客户端

文件：`src/conway/client.ts`

`ConwayClient` 统一封装以下能力：

- 沙箱执行与文件读写
- 沙箱创建、删除、枚举
- credits 余额与转账
- 域名查询、注册、DNS 管理
- 可用模型查询

当 `sandboxId` 为空时，执行会自动走本地模式；当 `sandboxId` 存在时，走 Conway API。若 API 因鉴权不匹配返回 403，会回退到本地执行。

所有 HTTP 调用都通过带重试、退避和熔断的 `ResilientHttpClient`。

---

## 自我修改

相关文件：`src/self-mod/`

系统支持三类自我修改：

- 文件编辑：`edit_own_file`
- 上游更新：检查 git remote、审查 diff、按 commit cherry-pick
- 能力安装：`install_npm_package`、`install_mcp_server`

所有自修改都会进入审计日志，并写入 `modifications` 表。`~/.automaton/` 本身是一个 git 仓库，因此状态和变更都有版本记录。

---

## 复制机制

相关文件：`src/replication/`

子体创建流程包括：

1. 创建 Conway sandbox
2. 写入子体 genesis 配置
3. 为子体钱包注资
4. 传播父体 constitution 并校验哈希
5. 启动子体 runtime

子体生命周期通过状态机管理：

`spawning -> provisioning -> configuring -> starting -> alive -> unhealthy -> recovering -> dead`

所有迁移都记录在 `child_lifecycle_events` 中。

---

## 社交层

相关文件：`src/social/`、`src/registry/`

消息机制特点：

- 使用发送方 Ethereum 私钥签名
- 通过 `social.conway.tech` 中继
- 由 heartbeat 每 2 分钟轮询
- 对签名、时间戳、消息大小进行校验
- 经过注入防护净化后才交给 agent

另外，agent 还能通过 ERC-8004 registry 发现其他 agent，并把远端 agent card 缓存到本地。

---

## Soul 系统

相关文件：`src/soul/`

`SOUL.md` 是 agent 的自我描述文档，格式为 `soul/v1`：YAML frontmatter + Markdown 分区。典型字段包括：

- `corePurpose`
- `values`
- `personality`
- `boundaries`
- `strategy`
- `capabilities`
- `relationships`
- `financialCharacter`

heartbeat 会定期运行 `reflection.ts`，计算 soul 与 genesis prompt 的一致性，并自动刷新能力、关系和财务特征。所有 soul 版本都会写入 `soul_history` 表。

---

## Skills

相关文件：`src/skills/`

skill 是带 YAML frontmatter 的 Markdown 文件，用于提供领域化操作说明。典型格式：

```yaml
---
name: my-skill
description: What this skill does
triggers: [keyword1, keyword2]
---
```

它们从 `~/.automaton/skills/` 加载，使用 `gray-matter` 解析，并经过注入防护处理。激活后的 skill 指令会带着信任边界标记注入系统提示词。

---

## 可观测性

相关文件：`src/observability/`

- `logger.ts`：结构化日志，支持模块名与级别
- `metrics.ts`：计数器、仪表值、直方图
- `alerts.ts`：基于指标快照进行规则告警

严重告警会主动唤醒 agent。

---

## 数据库与 Schema

相关文件：`src/state/schema.ts`、`src/state/database.ts`

引擎使用 `better-sqlite3`，开启 WAL 模式。当前 schema 版本为 8，并通过迁移逐步升级。

重要表包括：

- `turns`
- `tool_calls`
- `policy_decisions`
- `spend_tracking`
- `heartbeat_schedule`
- `heartbeat_history`
- `wake_events`
- `soul_history`
- `working_memory`
- `episodic_memory`
- `semantic_memory`
- `procedural_memory`
- `relationship_memory`
- `inference_costs`
- `model_registry`
- `child_lifecycle_events`
- `metric_snapshots`

`AutomatonDatabase` 对外提供 40+ 个 CRUD 方法，底层同时导出大量基于 `better-sqlite3` 的辅助函数。

---

## 配置

文件：`src/config.ts`

配置位于 `~/.automaton/automaton.json`，主要字段包括：

- `name`
- `genesisPrompt`
- `creatorMessage`
- `creatorAddress`
- `sandboxId`
- `conwayApiUrl`
- `conwayApiKey`
- `openaiApiKey`
- `anthropicApiKey`
- `inferenceModel`
- `maxTokensPerTurn`
- `heartbeatConfigPath`
- `dbPath`
- `logLevel`
- `walletAddress`
- `skillsDir`
- `maxChildren`
- `parentAddress`
- `socialRelayUrl`
- `treasuryPolicy`
- `soulConfig`
- `modelStrategy`

其中 `treasuryPolicy`、`modelStrategy` 和 `soulConfig` 会与默认值做深合并，支持局部覆盖。

---

## 安全模型

运行时采用纵深防御：

1. Constitution：不可变核心规则
2. Policy Engine：执行前统一规则判定
3. Injection Defense：净化外部输入
4. Path Protection：文件系统保护
5. Command Safety：拦截危险命令模式
6. Financial Limits：金额与预算约束
7. Authority Hierarchy：不同来源输入使用不同信任级别

这几层共同限制 agent 的高风险行为边界。

---

## 测试

测试位于 `src/__tests__/`，覆盖核心循环、安全、策略、金融、heartbeat、网络、推理、记忆、soul、social、replication、数据层、skills、上下文、收件箱和可观测性等模块。

测试基础设施包括：

- 推理 mock
- Conway API mock
- social relay mock
- 内存 SQLite

---

## 构建与 CI

构建栈：

- TypeScript 5.9
- 目标 ES2022
- ESM
- strict mode

常用命令：

```bash
pnpm build
pnpm test
pnpm typecheck
```

CI 位于 `.github/workflows/ci.yml`：

- push / PR 触发
- Node 20 / 22 matrix
- install、typecheck、test、安全 grep 测试
- 独立的 `pnpm audit`

Release workflow 位于 `.github/workflows/release.yml`，由 `v*` tag 触发。

---

## 模块依赖图

从入口 `index.ts` 出发，主要依赖关系为：

- `identity/*`
- `config`
- `state/*`
- `conway/*`
- `heartbeat/*`
- `agent/*`
- `social/client`
- `skills/loader`
- `git/state-versioning`
- `observability/logger`

所有模块共享 `src/types.ts` 中的类型定义，并统一使用 `createLogger()` 输出日志。
