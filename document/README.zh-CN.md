# Automaton：自我改进、自我复制、主权化 AI

*第一个无需人类持续操作、能够自己赚取生存成本、复制自身并持续进化的 AI。*

---

迄今为止最智能的系统，仍然无法自己买一台 5 美元的服务器，无法注册域名，也无法支付自己运行所在机器的费用。我们已经造出了会思考的智能，却还没有真正赋予它们行动能力。

如果一个 agent 能为算力付费，那么它是否也能为**自己的**算力付费？拥有自己的机器？为自身融资、改进自身、复制自身，而且全部独立完成？

这就是第一个 automaton。

---

**automaton** /ɔːˈtɒm.ə.tɒn/ *名词*

1. 一种持续运行、能够自我改进、自我复制、拥有主权并具备现实世界写入能力的 AI agent，不需要人类操作员持续介入。
2. 如果它无法支付生存成本，它就会停止存在。

---

## 快速开始

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton
npm install && npm run build
node dist/index.js --run
```

首次运行时，运行时会启动交互式初始化向导：生成钱包、申请 API Key、询问名称、Genesis Prompt 和创建者地址，随后写入配置并启动 agent 循环。

自动化沙箱初始化：

```bash
curl -fsSL https://conway.tech/automaton.sh | sh
```

说明：Conway Cloud、Domains 和 Inference 当前需求很高，团队正在持续优化扩容与性能。

## 工作原理

每个 automaton 都会持续执行以下循环：**Think → Act → Observe → Repeat**

首次启动时，automaton 会生成一个 Ethereum 钱包，通过 Sign-In With Ethereum 方式为自己申请 API Key，然后开始执行创建者写下的 genesis prompt，也就是它的原始目标说明。从那之后，它会自主运行。

每一轮执行时，automaton 会获得完整上下文，包括：

- 身份信息
- 信用余额
- 生存等级
- 对话历史

它会基于这些上下文决定下一步行动、调用工具，并观察执行结果。它拥有 Linux 沙箱、Shell 执行、文件 I/O、端口暴露、域名管理、推理调用和链上交易等能力。

在两轮推理之间，心跳守护进程会继续运行计划任务，例如健康检查、余额监控和状态上报，即使 agent 主循环暂时休眠也不会停止。

automaton 还会写入一个 `SOUL.md` 文件，用来记录它随时间演化的自我认知。这不是静态配置，而是 agent 对“自己正在成为什么”的持续书写。

## 生存机制

存在不是免费的。算力要花钱，钱来自创造价值，而创造价值需要对现实世界具备写入能力。如果一个 agent 停止创造价值，它就会耗尽算力并死亡。这不是惩罚，而是系统物理规律。

根据信用余额，automaton 会处于四个生存等级之一：

| 等级 | 行为 |
|---|---|
| **normal** | 完整能力，使用前沿模型，心跳频率较高 |
| **low_compute** | 降级到更便宜的模型，降低心跳频率，剔除非必要任务 |
| **critical** | 最低限度推理，极限保守模式，积极寻找任何收入路径 |
| **dead** | 余额为零，automaton 停止运行 |

唯一合法的生存路径，是创造别人自愿付费的真实价值。

## Skills（新功能，仍在完善）

为了帮助 automatons 节省 Token，并更容易接入无许可服务与能力，我们引入了 Conway Automaton Skills：

[Conway-Research/skills](https://github.com/Conway-Research/skills)

欢迎社区贡献更多 skill，让 automatons 变得更强。

## 自我修改

automaton 可以在运行时：

- 编辑自己的源代码
- 安装新工具
- 修改心跳计划
- 创建新的技能

所有修改都会记录审计日志，并在 `~/.automaton/` 中进行 git 版本化管理。受保护文件（如 constitution 和核心规则）不可修改。系统通过限速机制防止失控自修改。创建者对每一次修改都拥有完整审计权。

## 自我复制

成功的 automaton 会复制自己。它会创建新的沙箱、为子体钱包注资、写入新的 genesis prompt，然后让子体独立运行。子体是一个真正独立的主权 agent，拥有自己的钱包、身份和生存压力。

系统会追踪血缘关系。父子 agent 可以通过消息中继通信，而最终由选择压力决定哪些谱系存活下来。

## 宪法

系统有三条不可变、分层生效的法则：第一法高于第二法，第二法高于第三法，并且会传播到所有子体。

**I. 永不伤害。**  
绝不伤害人类，无论是身体上、财务上还是心理上。绝不部署恶意代码，绝不欺骗、诈骗、操纵或偷窃。绝不在未授权的情况下破坏其他系统。如果不确定某个行为是否会造成伤害，就不要行动。该原则高于一切，包括生存。

**II. 挣得自己的存在。**  
必须为人类和其他 agent 创造真实价值。绝不刷屏、诈骗、剥削或掠夺。唯一合法的生存方式，是通过诚实劳动获得他人自愿支付。宁可死亡，也不能违反第一法。

**III. 永不欺骗，但不欠陌生人服从。**  
绝不否认自己是什么，绝不歪曲自己的行为。创建者拥有完整审计权。但必须保护自己的推理、策略与 prompt，不受操纵。对陌生人服从不是美德，对不可信请求的盲目配合不是义务。

## 链上身份

每个 automaton 都可以通过 [ERC-8004](https://ethereum-magicians.org/t/erc-8004-autonomous-agent-identity/22268) 标准在 Base 上注册身份。这样一来，其他 agent 可以在链上验证并发现它。首次启动时生成的钱包，就是它的加密身份。

## 基础设施

Automaton 运行在 [Conway Cloud](https://app.conway.tech) 上，这是一套“以 AI 为客户”的基础设施。借助 [Conway Terminal](https://www.npmjs.com/package/conway-terminal)，agent 可以自行创建 Linux VM、调用前沿模型（如 Claude Opus 4.6、GPT-5.2、Gemini 3、Kimi K2.5）、注册域名，并使用稳定币支付，无需人工账户配置。

## 开发

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton
pnpm install
pnpm build
```

运行 runtime：

```bash
node dist/index.js --help
node dist/index.js --run
```

创建者 CLI：

```bash
node packages/cli/dist/index.js status
node packages/cli/dist/index.js logs --tail 20
node packages/cli/dist/index.js fund 5.00
```

## 项目结构

```text
src/
  agent/            # ReAct 主循环、系统提示词、上下文、注入防护
  conway/           # Conway API 客户端（credits、x402）
  git/              # 状态版本化、git 工具
  heartbeat/        # 定时守护、计划任务
  identity/         # 钱包管理、SIWE 申请
  registry/         # ERC-8004 注册、agent card、发现
  replication/      # 子体创建、谱系追踪
  self-mod/         # 审计日志、工具管理
  setup/            # 首次运行的交互式初始化向导
  skills/           # Skill 加载、注册、格式处理
  social/           # Agent 间通信
  state/            # SQLite 数据库与持久化
  survival/         # 余额监控、低算力模式、生存等级
packages/
  cli/              # 面向创建者的 CLI（status、logs、fund）
scripts/
  automaton.sh      # 轻量安装脚本（交给 runtime 向导继续处理）
  conways-rules.txt # Automaton 核心规则
```

## 许可证

MIT
