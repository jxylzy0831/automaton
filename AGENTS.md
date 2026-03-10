# AGENTS.md

本文件为在本仓库中工作的 Codex / 代码代理提供中文协作说明。目标是让代理在尽量少打扰用户的前提下，快速理解项目、遵守约束并完成修改。

## 项目概览

- 项目名：`@conway/automaton`
- 类型：TypeScript 单仓库（monorepo 风格，根目录 + `packages/cli`）
- 运行时：Node.js `>=20`
- 包管理器：`pnpm`
- 构建产物：根目录 `dist/`，以及 `packages/cli/dist/`

该项目是一个自主运行的 AI agent runtime。核心能力包括：

- 代理主循环（think / act / observe）
- 身份与钱包管理
- 生存状态与余额监控
- 心跳与定时任务
- 自修改与审计
- 子代理复制与谱系追踪
- 技能加载与执行
- 面向创建者的 CLI

## 目录说明

根目录重要路径如下：

- `src/agent/`：代理主循环、上下文、提示词与注入防护
- `src/conway/`：Conway API 客户端与相关能力
- `src/git/`：状态版本化、git 集成
- `src/heartbeat/`：心跳守护与定时任务
- `src/identity/`：钱包与 SIWE 相关逻辑
- `src/registry/`：ERC-8004 注册、卡片、发现
- `src/replication/`：子代理创建与谱系追踪
- `src/self-mod/`：自修改、工具管理、审计
- `src/setup/`：首次运行向导
- `src/skills/`：技能加载、注册、格式处理
- `src/social/`：代理间通信
- `src/state/`：SQLite 持久化
- `src/survival/`：信用余额、生存等级、降级逻辑
- `packages/cli/`：创建者 CLI
- `scripts/`：安装脚本与规则文件

## 常用命令

优先使用 `pnpm`：

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm dev
```

运行主程序：

```bash
node dist/index.js --help
node dist/index.js --run
```

运行 CLI：

```bash
node packages/cli/dist/index.js status
node packages/cli/dist/index.js logs --tail 20
node packages/cli/dist/index.js fund 5.00
```

## 代理工作准则

### 1. 先读再改

在修改代码前，先查看与任务直接相关的模块，避免仅凭文件名猜测行为。优先使用快速检索：

```bash
rg "关键词" src packages
rg --files src packages
```

### 2. 修改范围尽量小

- 只改和当前任务直接相关的文件
- 避免顺手重构无关代码
- 不要在没有明确需求时调整公共接口、目录结构或命名

### 3. 保持现有风格

- 遵循已有 TypeScript / ESM 写法
- 沿用现有命名方式与模块边界
- 没有充分理由时，不额外引入依赖

### 4. 优先验证

完成修改后，至少执行与改动范围匹配的验证：

- 小范围改动：优先跑相关测试
- 类型相关改动：运行 `pnpm typecheck`
- 构建相关改动：运行 `pnpm build`

如果由于环境、依赖或时间限制未执行验证，需要明确说明未验证项。

### 5. 不做破坏性操作

除非用户明确要求，否则不要执行以下操作：

- `git reset --hard`
- `git checkout -- <file>`
- 删除用户现有未提交改动
- 大规模覆盖生成文件

### 6. 注意高风险模块

以下逻辑改动需要格外谨慎，并优先补充验证：

- 支付、余额、花费、资金流转
- 提示词注入防护与权限边界
- 自修改 / 审计 / 规则文件
- 复制、注册、身份、钱包相关逻辑
- 持久化与数据库 schema

## 对 Codex 的具体要求

- 默认直接动手，不要只停留在建议层面
- 在开始较大改动前，先用一句话说明将查看什么或准备改什么
- 编辑文件时保持 ASCII 为主，除非文件本身已使用其他字符且确有必要
- 新增注释应简短，只解释不直观的逻辑
- 如果发现仓库里已有用户改动，除非冲突，否则不要回退

## 建议的交付格式

完成任务后，回复应尽量简洁，通常包括：

- 做了什么
- 改了哪些关键文件
- 运行了哪些验证
- 是否还有风险或未完成项

## 备注

- 本文件是给代码代理看的，不是产品文档
- 若本文件与用户在当前对话中的明确要求冲突，以用户要求为准
