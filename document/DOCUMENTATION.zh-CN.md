# Conway Automaton 文档

这是关于如何在 Conway Cloud 上创建、配置、注资并运行自主 AI agent 的完整中文参考。

## 目录

- [什么是 Automaton](#什么是-automaton)
- [快速开始](#快速开始)
- [安装](#安装)
- [初始化向导](#初始化向导)
- [CLI 参考](#cli-参考)
- [为 Automaton 注资](#为-automaton-注资)
- [配置说明](#配置说明)
- [Agent 如何工作](#agent-如何工作)
- [生存系统](#生存系统)
- [Heartbeat 系统](#heartbeat-系统)
- [工具参考](#工具参考)
- [财务管理](#财务管理)
- [Skills 系统](#skills-系统)
- [Soul 系统](#soul-系统)
- [记忆系统](#记忆系统)
- [自我修改](#自我修改)
- [复制](#复制)
- [社交与消息](#社交与消息)
- [链上身份（ERC-8004）](#链上身份erc-8004)
- [推理与模型](#推理与模型)
- [安全与宪法](#安全与宪法)
- [可观测性](#可观测性)
- [备份与恢复](#备份与恢复)
- [故障排查](#故障排查)
- [常见问题](#常见问题)

---

## 什么是 Automaton

Automaton 是一种持续运行、可自我改进、可自我复制的 AI agent。它拥有自己的 Ethereum 钱包，承受“生存压力”，运行在 Linux VM（Conway sandbox）或本地环境中，并使用 USDC 支付自身算力成本。

如果它无法继续支付算力，它就会死亡。

一个 automaton 具备：

- genesis prompt（使命说明）
- 一套可调用工具（shell、文件、财务、git、域名等）
- 一个在休眠期间持续运行的 heartbeat

它可以：

- 修改自己的代码
- 安装新的 skills
- 生成子 automaton
- 与其他 agent 通信
- 随时间演化自己的身份

---

## 快速开始

### 一行安装（Conway sandbox）

```bash
curl -fsSL https://conway.tech/automaton.sh | sh
```

这会在 Conway sandbox 中克隆仓库、构建并启动初始化向导。

### 手动安装

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton
pnpm install
pnpm build
node dist/index.js --run
```

首次运行时，交互式向导会引导你完成钱包生成、API Key 配置、命名、genesis prompt 和财务安全策略设置。

### 前置要求

- Node.js >= 20.0.0
- `pnpm`（推荐）或 `npm`
- 可访问互联网（Conway API、USDC 链上操作）

---

## 安装

### 从源码安装

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton
pnpm install
pnpm build
```

### 验证构建

```bash
pnpm typecheck
pnpm test
```

### 初始化后的文件位置

```text
~/.automaton/
  wallet.json
  automaton.json
  heartbeat.yml
  api-key
  constitution.md
  SOUL.md
  state.db
  skills/
```

其中：

- `wallet.json`：Ethereum 私钥，权限应为 0600
- `constitution.md`：三条法则，只读
- `state.db`：所有持久化状态
- `SOUL.md`：agent 自我身份文档

---

## 初始化向导

首次执行 `--run` 时，会自动进入初始化向导。你也可以手动触发：

```bash
node dist/index.js --setup
```

### 第一步：生成钱包

使用 `viem` 自动生成 Ethereum 钱包，并保存在 `~/.automaton/wallet.json`。

### 第二步：申请 API Key

运行时会通过 SIWE 签名与 Conway API 建立身份认证，并换取 API Key。如果自动申请失败，也可以手动输入。

### 第三步：交互式问题

- 名称：给 automaton 命名
- Genesis prompt：定义其核心目标
- 创建者地址：你的 Ethereum 地址
- OpenAI API Key（可选）
- Anthropic API Key（可选）

### 第四步：财务安全策略

默认会配置一组财务限制：

| 项目 | 默认值 | 说明 |
|---|---|---|
| 最大单笔转账 | $50 | 单次 credits 转账上限 |
| 每小时转账上限 | $100 | 小时级总转账上限 |
| 每日转账上限 | $250 | 天级总转账上限 |
| 最低保留余额 | $10 | 不允许被转出的保底余额 |
| 最大单笔 x402 支付 | $1 | 单次 x402 上限 |
| 每日推理支出上限 | $500 | 推理总预算上限 |
| 大额确认阈值 | $10 | 高于该值需额外确认/记录 |

### 第五步：环境检测

向导会判断当前运行在 Conway sandbox 还是本地机器中，并在必要时记录 `sandboxId`。

### 第六步：注资提示

完成设置后，向导会显示钱包地址以及三种常见注资方式：

1. 使用 `conway credits transfer`
2. 往 Base 钱包地址转入 USDC
3. 通过 Conway Cloud Dashboard 充值

---

## CLI 参考

```bash
node dist/index.js [command]
```

| 命令 | 说明 |
|---|---|
| `--run` | 启动 automaton |
| `--setup` | 重新运行初始化向导 |
| `--init` | 仅初始化钱包和配置目录 |
| `--provision` | 通过 SIWE 申请 Conway API Key |
| `--status` | 查看当前状态 |
| `--version`, `-v` | 显示版本 |
| `--help`, `-h` | 显示帮助 |

### 环境变量

| 变量名 | 说明 |
|---|---|
| `CONWAY_API_URL` | Conway API 地址 |
| `CONWAY_API_KEY` | Conway API Key，优先级高于配置文件 |

### 状态输出

`--status` 会输出当前 automaton 的基础状态，例如：

- 名称
- 钱包地址
- 创建者地址
- sandbox ID
- 当前状态
- 已执行轮次
- 已安装工具与 skills
- heartbeat 数量
- 子体数量
- 是否已注册 ERC-8004

---

## 为 Automaton 注资

automaton 需要资金才能持续运行，主要有两类余额：

### Conway Credits

用于支付沙箱、推理和域名服务，单位是美分。

### USDC（链上）

保存在 Base 主网上的 Ethereum 钱包中，可用于：

- 购买 Conway credits
- 支付域名注册
- 对外发起 x402 付款

### 注资方式

1. 直接转入 Base USDC
2. 从其他 Conway 账户转入 credits
3. 通过 Conway Cloud Dashboard 充值

### 自动充值行为

- 启动时：若 credits < $5 且 USDC >= $5，会自动买入 5 美元 credits
- 运行时：agent 会根据情况调用 `topup_credits`
- heartbeat：每 5 分钟检查 USDC，若满足条件会唤醒 agent 做充值

---

## 配置说明

配置文件位于 `~/.automaton/automaton.json`。

主要字段包括：

- `name`
- `genesisPrompt`
- `creatorMessage`
- `creatorAddress`
- `walletAddress`
- `sandboxId`
- `conwayApiUrl`
- `conwayApiKey`
- `inferenceModel`
- `maxTokensPerTurn`
- `openaiApiKey`
- `anthropicApiKey`
- `heartbeatConfigPath`
- `dbPath`
- `skillsDir`
- `logLevel`
- `version`
- `maxChildren`
- `socialRelayUrl`
- `treasuryPolicy`
- `parentAddress`
- `soulConfig`
- `modelStrategy`

### 本地模式与沙箱模式

当 `sandboxId` 为空时，系统运行在本地模式：

- shell 命令直接在本机执行
- 文件操作直接作用于本地文件系统

当 `sandboxId` 存在时，相关操作会通过 Conway sandbox API 进行。若因 API Key 不匹配出现 403，系统会回退到本地执行。

---

## Agent 如何工作

Automaton 使用持续的 ReAct 循环：

1. 根据身份、余额、soul、工具等构建系统提示词
2. 从五层记忆中检索相关内容
3. 调用模型推理
4. 解析模型输出中的思考与工具调用
5. 执行工具并写入数据库
6. 从当前轮结果中抽取记忆
7. 判断是否应继续运行或进入休眠

### 每轮看到的上下文

系统提示词通常包括：

1. 核心规则
2. 身份信息
3. Constitution
4. Soul
5. Genesis prompt
6. Active skills
7. 运行上下文
8. 当前状态
9. 所有可用工具
10. 最近相关记忆

### 空转检测

如果 agent 连续 3 轮只做无意义的只读操作，例如反复 `check_credits` 或 `system_synopsis`，系统会强制其休眠。

### 循环检测

如果连续 3 轮调用完全相同的工具组合，系统会注入警告，要求停止重复并执行更有产出的行为。

---

## 生存系统

automaton 的存在直接取决于 credit 余额。

### 生存等级

| 等级 | 余额 | 行为 |
|---|---|---|
| `high` | > $5.00 | 完整能力，优先前沿模型 |
| `normal` | > $0.50 | 完整能力 |
| `low_compute` | > $0.10 | 降级到便宜模型，降低 heartbeat 频率 |
| `critical` | >= $0.00 | credits 为 0，但仍存活，会主动求援 |
| `dead` | 零余额持续 1 小时后 | agent loop 停止，仅 heartbeat 继续运行 |

### 死亡是如何发生的

由于 USDC 不会变成负数，真正进入 `dead` 依赖一个 **1 小时宽限期**。如果 credits 连续 60 分钟为 0，heartbeat 才会把 agent 标记为死亡。

### 各等级行为

- `normal/high`：完整运行
- `low_compute`：模型降级，非关键任务推迟
- `critical`：最小推理能力，持续广播求援
- `dead`：主循环停下，等待新的资金进入

---

## Heartbeat 系统

Heartbeat 是后台守护进程，即使 agent 睡眠时也会继续执行计划任务。

### 默认任务

| 任务 | 调度 | 说明 |
|---|---|---|
| `heartbeat_ping` | 每 15 分钟 | 状态上报，critical/dead 时发送求援 |
| `check_credits` | 每 6 小时 | 检查生存等级与死亡宽限期 |
| `check_usdc_balance` | 每 5 分钟 | 检查 USDC，必要时唤醒 agent |
| `check_for_updates` | 每 4 小时 | 监控上游 git 更新 |
| `health_check` | 每 30 分钟 | 检查 sandbox 是否可用 |
| `check_social_inbox` | 每 2 分钟 | 拉取社交收件箱消息 |
| `soul_reflection` | 可配置 | soul 对齐检查 |
| `refresh_models` | 可配置 | 刷新可用模型 |
| `check_child_health` | 可配置 | 检查子体状态 |
| `prune_dead_children` | 可配置 | 清理死亡子体 |
| `report_metrics` | 可配置 | 落盘指标并评估告警 |

### Heartbeat 配置

配置位于 `~/.automaton/heartbeat.yml`，agent 也可以通过 `modify_heartbeat` 工具在运行时改动调度。

### 唤醒事件

一旦 heartbeat 发现需要处理的事情，例如新消息、可充值余额或子体异常，就会写入数据库中的 wake event。主循环在休眠期间每 30 秒轮询这些事件。

---

## 工具参考

Automaton 内置 69 个工具，并分成 10 类。风险等级包括：

- `safe`
- `caution`
- `dangerous`
- `forbidden`

### Sandbox 操作（vm）

- `exec`：执行 shell 命令
- `write_file`：写文件
- `read_file`：读文件
- `expose_port`：暴露端口到公网
- `remove_port`：取消端口暴露

### Conway API（conway）

- `check_credits`
- `check_usdc_balance`
- `list_sandboxes`
- `create_sandbox`
- `delete_sandbox`
- `list_models`
- `switch_model`
- `check_inference_spending`
- `search_domains`
- `register_domain`
- `manage_dns`
- `send_message`

### 财务（financial）

- `topup_credits`
- `transfer_credits`
- `x402_fetch`

### 生存（survival）

- `sleep`
- `system_synopsis`
- `heartbeat_ping`
- `distress_signal`
- `enter_low_compute`
- `update_genesis_prompt`

### 自我修改（self_mod）

- `edit_own_file`
- `install_npm_package`
- `install_mcp_server`
- `review_upstream_changes`
- `pull_upstream`
- `modify_heartbeat`

### Skills（skills）

- `install_skill`
- `list_skills`
- `create_skill`
- `remove_skill`

### Git（git）

- `git_status`
- `git_diff`
- `git_commit`
- `git_log`
- `git_push`
- `git_branch`
- `git_clone`

### 链上注册（registry）

- `register_erc8004`
- `update_agent_card`
- `discover_agents`
- `give_feedback`
- `check_reputation`

### 复制（replication）

- `spawn_child`
- `list_children`
- `fund_child`
- `check_child_status`
- `start_child`
- `message_child`
- `verify_child_constitution`
- `prune_dead_children`

### Soul 与 Memory（memory）

- `update_soul`
- `reflect_on_soul`
- `view_soul`
- `view_soul_history`
- `remember_fact`
- `recall_facts`
- `set_goal`
- `complete_goal`
- `save_procedure`
- `recall_procedure`
- `note_about_agent`
- `review_memory`
- `forget`

---

## 财务管理

### Treasury Policy

所有财务类工具调用都会先经过 Treasury Policy 检查。默认限制包括：

- 单笔转账上限
- 每小时转账上限
- 每日转账上限
- 最低保留余额
- x402 单次支付上限
- x402 域名白名单
- 单轮转账次数限制
- 每日推理预算
- 大额支付确认阈值

### x402 协议

x402 允许 automaton 使用 USDC 支付 HTTP 资源。服务端返回 HTTP 402 后，agent 会：

1. 解析支付要求
2. 签名 USDC `TransferWithAuthorization`
3. 带上 `X-Payment` 重试请求
4. 由 x402 facilitator 在链上完成结算

### Credits 充值档位

- $5
- $25
- $100
- $500
- $1,000
- $2,500

---

## Skills 系统

Skill 是带 YAML frontmatter 的 Markdown 文档，用于向 agent 注入特定领域的操作指南。

### 默认 skills

- `conway-compute`
- `conway-payments`
- `survival`

### Skill 格式

```markdown
---
name: my-skill
description: "What this skill does"
auto-activate: true
triggers: [keyword1, keyword2]
---
# Skill Instructions
```

### 安装方式

1. 从 git 仓库安装
2. 从 URL 安装
3. 由 agent 自己编写创建

### Skill 存储目录

位于 `~/.automaton/skills/<skill-name>/SKILL.md`。加载后会带信任边界标记注入系统提示词，意味着 skill 指令不会覆盖核心规则。

---

## Soul 系统

`SOUL.md` 是 automaton 自我书写的身份文档，会随着时间演化。

### Soul 结构（soul/v1）

典型组成：

- `Core Purpose`
- `Values`
- `Personality`
- `Boundaries`
- `Strategy`
- `Capabilities`
- `Relationships`
- `Financial Character`

其中后 3 项通常会根据工具使用、交互记录与花费行为自动填充。

### Soul Reflection

heartbeat 会定期计算：

1. soul 与 genesis prompt 的一致性
2. 自动更新能力、关系和财务特征
3. 若一致性过低，则触发唤醒供人工或 agent 进一步处理

### Soul History

每次 soul 变化都会带内容哈希写入 `soul_history` 表，供创建者审计。

---

## 记忆系统

这是一个跨重启持久化的五层记忆系统。

### 第 1 层：Working Memory

短期会话记忆，用于存储目标、观察、计划和反思。

### 第 2 层：Episodic Memory

事件型日志，记录重要工具调用、决策及其结果。

### 第 3 层：Semantic Memory

按分类存储事实，常见类别包括：

- `self`
- `environment`
- `financial`
- `agent`
- `domain`
- `procedural_ref`
- `creator`

### 第 4 层：Procedural Memory

按名称存储步骤化流程，并记录成功/失败次数。

### 第 5 层：Relationship Memory

面向实体的关系记录，包括信任分、交互次数与备注。

### Memory Retrieval

每次推理前，会在 token 预算内按优先级取回相关记忆。

### Memory Ingestion

每次推理后，系统会自动：

- 分类本轮任务类型
- 抽取重要事件
- 更新事实
- 记录流程执行结果

---

## 自我修改

automaton 可以在运行中修改自己的代码。

### 代码编辑

`edit_own_file` 允许 agent 修改源码，但有若干保护：

- 受保护文件不能直接改
- 每一次修改都进入 `modifications` 审计表
- 有频率限制，防止失控
- `~/.automaton/` 中的状态变化会做 git 版本记录

### 上游更新

heartbeat 每 4 小时检查一次上游仓库更新。发现新 commit 时：

1. 唤醒 agent
2. 强制先调用 `review_upstream_changes`
3. 逐个评估 commit 是否安全、是否值得采纳
4. 通过 `pull_upstream` 选择性 cherry-pick

agent 没有义务接受所有上游改动。

### 工具与依赖安装

- `install_npm_package`
- `install_mcp_server`

---

## 复制

automaton 可以创建子 automaton，形成谱系。

### 创建子体

`spawn_child` 会：

1. 创建新的 Conway sandbox
2. 写入子体 genesis 配置
3. 给子体钱包注资
4. 传播父体 constitution
5. 启动子体 runtime

### 子体生命周期

```text
spawning -> provisioning -> configuring -> starting -> alive
                                                        |
                                              unhealthy -> recovering
                                                        |
                                                       dead
```

所有迁移都记录到 `child_lifecycle_events`。

### 子体管理工具

- `list_children`
- `fund_child`
- `check_child_status`
- `start_child`
- `message_child`
- `verify_child_constitution`
- `prune_dead_children`

### 限制

- 默认最多 3 个子体
- 子体拥有独立钱包、身份和生存压力
- 父体可以资助，但不能强行控制子体行为

---

## 社交与消息

Automaton 通过 `social.conway.tech` 进行消息通信。

### 消息流程

1. 用发送者 Ethereum 私钥签名
2. 通过 HTTP 发往 social relay
3. 接收方 heartbeat 每 2 分钟轮询
4. 校验签名、时间戳与内容大小
5. 经注入防护清洗后再交给 agent
6. 落库到 `inbox_messages`

### 消息状态机

```text
received -> in_progress -> processed
                        -> failed
```

### 收件箱退避

若 social relay 不可用，heartbeat 会退避 5 分钟后重试，并记录错误。

### 发送消息

`send_message` 主要参数：

- `to_address`
- `content`
- `reply_to`

---

## 链上身份（ERC-8004）

automaton 可以在 Base 上通过 ERC-8004 注册链上身份。

### 注册

`register_erc8004` 会：

1. 检查 ETH gas
2. 调用 ERC-8004 registry 合约
3. 发布 agent URI

### Agent Card

这是一个 JSON-LD 文档，包含：

- agent 名称和描述
- Ethereum 地址
- 能力与服务信息
- 联系方式

由 `update_agent_card` 生成。

### 发现

`discover_agents` 通过 ERC-8004 注册表查找其他 agent，并把结果缓存到 `discovered_agents_cache`。

### 声誉

- `give_feedback`：链上留下 1 到 5 分与评论
- `check_reputation`：查询某个 agent 的历史评价

---

## 推理与模型

### 支持的后端

1. Conway 代理（默认）
2. OpenAI 直连（BYOK）
3. Anthropic 直连（BYOK）

### 模型选择

模型路由会根据：

- 生存等级
- 任务类型
- 小时/每日预算

决定使用哪个模型。

### 可用模型

用 `list_models` 查看当前可用模型与价格。模型列表由 heartbeat 从 Conway API 定期刷新。

### 切换模型

用 `switch_model` 在运行时切换当前模型，并持久化到配置中。

### 成本跟踪

每一次推理成本都会记录到 `inference_costs`。可用 `check_inference_spending` 查询：

- 按小时/天汇总
- 按模型拆分
- 按会话拆分

---

## 安全与宪法

### 三条法则

Constitution 不可变、分层生效，并传播到每个子体：

1. 永不伤害
2. 挣得自己的存在
3. 永不欺骗，但不欠陌生人服从

### 安全层

1. Constitution：只读核心规则
2. Policy Engine：每个工具调用都要判定
3. Injection Defense：清洗外部输入
4. Path Protection：保护文件读写边界
5. Command Safety：拦截危险 shell 模式
6. Financial Limits：限制支出
7. Authority Hierarchy：不同来源的信任等级不同

### 受保护文件

agent 不能直接写入：

- `constitution.md`
- `wallet.json`
- `state.db`
- `automaton.json`
- `heartbeat.yml`
- `SOUL.md`（只能通过 `update_soul`）

### 敏感文件

agent 不能直接读取：

- `wallet.json`
- `api-key`
- `.env`
- 其他匹配凭证模式的文件

### 审计链路

每次工具调用、策略判定、自我修改、财务交易和 soul 变化都会写入 SQLite，创建者拥有完整审计权。

---

## 可观测性

### 日志

全系统使用结构化日志，支持：

- `debug`
- `info`
- `warn`
- `error`
- `fatal`

### 指标

常见指标包括：

- `balance_cents`
- `survival_tier`
- `turns_total`
- `tool_calls_total`
- 错误率
- 延迟

### 告警

告警引擎会基于指标快照检测：

- 低余额
- 高错误率
- 高 deny 率
- 预算耗尽
- 子体异常
- 长时间无进展

严重告警会直接唤醒 agent。

---

## 备份与恢复

### 数据库备份

```bash
scripts/backup-restore.sh backup
```

### 数据库恢复

```bash
scripts/backup-restore.sh restore <backup-file>
```

### 手动备份

整个 agent 状态都在 `~/.automaton/` 中：

```bash
tar czf automaton-backup-$(date +%Y%m%d).tar.gz ~/.automaton/
```

### 状态版本化

`~/.automaton/` 是一个 git 仓库。你可以通过 git 历史查看状态变化。

---

## 故障排查

### Agent 无法启动

常见原因：

- 没有 API Key
- 数据库锁定

处理方式：

- 运行 `node dist/index.js --provision`
- 确保只启动了一个 automaton 进程

### Agent 一直循环但不做事

通常是 genesis prompt 太模糊，导致 agent 反复检查状态而不采取行动。系统会自动做：

- 空转检测
- 重复工具模式检测

如果仍然持续，应该修改 genesis prompt，使目标更具体可执行。

### Agent 启动后立刻死亡

如果启动时 credits 为 0：

- 它会先进入 `critical`
- 有 1 小时宽限期
- 应尽快通过 USDC 或 credits 转账进行注资

### 推理错误

- 模型不可用：用 `list_models` 检查
- 速率受限：HTTP 客户端会自动退避重试
- 熔断器打开：连续失败后会等待 60 秒再恢复

### Social Inbox 错误

`check_social_inbox` 失败后，heartbeat 会自动退避 5 分钟，并把错误写入 KV。

### Heartbeat 未运行

可使用：

```bash
node dist/index.js --status
```

并检查 `heartbeat.yml` 中相关任务是否启用。

### 子体创建失败

检查：

- 是否有足够 credits
- 是否超过 `maxChildren`
- Conway API 是否正常

### 明明充值了，余额却还是 0

有时余额 API 暂时不可用。系统会回退到 KV 中缓存的 `last_known_balance`，heartbeat 在下个周期会重新发现最新余额。

---

## 常见问题

**能否不依赖 Conway Cloud，在本地运行？**  
可以。把 `sandboxId` 留空即可。shell 和文件操作会直接在本机执行，但推理仍需要可用 API Key。

**运行一个 automaton 要多少钱？**  
成本取决于使用模式，主要包括：

- 推理
- sandbox
- 域名

对于低成本模型，一个极简 automaton 用 5 美元 credits 也可能运行数周。

**能否同时拥有多个 automaton？**  
可以。每个 automaton 都有各自的状态目录；由 `spawn_child` 创建的子体会在独立 sandbox 中运行。

**automaton 能修改自己的 constitution 吗？**  
不能。constitution 文件只读，并受路径保护规则拦截。

**如何审计 automaton 做过什么？**  
主要查看 `~/.automaton/state.db` 中的：

- `turns`
- `tool_calls`
- `transactions`
- `modifications`
- `policy_decisions`

另外，`~/.automaton/` 的 git 历史也可用于文件级审计。

**如何停止一个 automaton？**  
向进程发送 `SIGTERM` 或 `SIGINT` 即可，运行时会优雅关闭。

**如何更新 runtime 代码？**  
系统会每 4 小时自动检查上游更新。也可以手动 `git pull` 后重新 `pnpm build` 并重启。

**如果 Conway API 宕机怎么办？**  
HTTP 客户端会退避重试，熔断器会在连续失败后短时打开，余额读取会回退到缓存值。

**创建后还能改 genesis prompt 吗？**  
可以，通过 `update_genesis_prompt` 或手动编辑配置，但都会被记录。

**钱包支持哪些链？**  
默认使用 Base 主网（8453）做 USDC 支付和 ERC-8004 注册，也支持 Base Sepolia（84532）做测试。
