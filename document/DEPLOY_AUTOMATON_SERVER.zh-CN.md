# Automaton 从 0 到跑起来部署清单

本文档适用于一台全新的 Ubuntu Linux 服务器，目标是把 `automaton` 从空机器部署到可运行状态。

建议环境：

- Ubuntu 24.04 LTS
- 2 核 2G 起步，2 核 4G 更稳
- 已具备公网访问能力

## 1. 登录服务器

```bash
ssh ubuntu@<你的服务器公网IP>
```

作用：通过 SSH 登录到你的 Linux 服务器。  
说明：如果默认用户名不是 `ubuntu`，把它改成云厂商提供的用户名。

## 2. 更新系统并安装基础工具

```bash
sudo apt update
```

作用：刷新 APT 软件源索引，让系统知道最新可安装的软件版本。

```bash
sudo apt upgrade -y
```

作用：把当前服务器上已经安装的软件升级到最新版本。  
说明：`-y` 表示自动确认，不再手动输入 `y`。

```bash
sudo apt install -y git curl build-essential tmux
```

作用：

- `git`：用于拉取代码仓库
- `curl`：用于下载脚本和测试外网连通性
- `build-essential`：安装编译工具链，部分 Node 依赖会用到
- `tmux`：后面用于后台运行 `automaton`

## 3. 安装 Node.js 20 和 pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

作用：添加 NodeSource 的 Node.js 20 安装源。  
说明：这一步会把适合 Ubuntu 的 Node.js 20 软件源配置到系统里。

```bash
sudo apt install -y nodejs
```

作用：安装 Node.js 和 npm。  
说明：本项目要求 Node.js `>=20`。

```bash
sudo corepack enable
```

作用：启用 Corepack。  
说明：Corepack 是 Node 自带的包管理器调度工具，用来管理 `pnpm` 这类工具版本。

```bash
corepack prepare pnpm@10.28.1 --activate
```

作用：安装并启用项目指定版本的 `pnpm`。  
说明：这个仓库的 `package.json` 里声明的是 `pnpm@10.28.1`。

## 4. 检查 Node.js 和 pnpm 是否安装成功

```bash
node -v
```

作用：查看当前 Node.js 版本。  
期望：输出 `v20.x` 或更高版本。

```bash
pnpm -v
```

作用：查看当前 `pnpm` 版本。  
期望：能输出版本号，说明 `pnpm` 已可用。

## 5. 检查外网访问

```bash
curl -I https://www.google.com
```

作用：测试服务器是否能访问 Google。  
说明：`-I` 表示只取响应头，不下载页面主体。

```bash
curl -I https://openai.com
```

作用：测试服务器是否能访问 OpenAI 官网域名。

```bash
curl -I https://api.anthropic.com
```

作用：测试服务器是否能访问 Anthropic API 域名。

说明：这些命令返回 HTTP 状态码不一定代表“成功登录”，但只要不是超时、DNS 失败、连接失败，通常说明外网链路是通的。

## 6. 拉取项目代码

```bash
cd ~
```

作用：回到当前用户的家目录，后续把项目克隆到这里。

```bash
git clone https://github.com/Conway-Research/automaton.git
```

作用：从 GitHub 拉取 `automaton` 仓库源码到本机。

```bash
cd automaton
```

作用：进入项目目录，后续安装依赖和构建都在这里执行。

如果你已经把仓库上传到了服务器，只需执行：

```bash
cd ~/automaton
```

作用：直接进入你已经准备好的项目目录。

## 7. 安装依赖

```bash
pnpm install
```

作用：安装项目依赖，包括根目录和 workspace 子包依赖。

说明：如果出现类似下面的 warning：

```text
Failed to create bin ...
Ignored build scripts: bufferutil, utf-8-validate
```

通常可以先继续，不一定会阻止项目运行。下一步先尝试构建。

## 8. 构建项目

```bash
pnpm build
```

作用：把 TypeScript 源码编译成可运行的 JavaScript，生成 `dist/` 和 `packages/cli/dist/`。

## 9. 先做安全检查，不直接长期运行

```bash
node dist/index.js --help
```

作用：查看主程序帮助信息，确认编译产物可执行。

```bash
node dist/index.js --init
```

作用：初始化或读取 automaton 的本地身份目录和钱包信息。  
说明：这一步不会进入长期运行循环，风险比 `--run` 低。

## 10. 首次正式运行

```bash
node dist/index.js --run
```

作用：正式启动 automaton runtime。  
说明：首次运行会进入 setup wizard，并开始写入 `~/.automaton/` 下的配置、钱包、状态等文件。

首次运行时通常需要你填写：

- 链类型：`evm` 或 `solana`
- `creatorAddress`
- `genesis prompt`
- 可选的 `Conway API key`
- 可选的 `OpenAI API key`
- 可选的 `Anthropic API key`
- 可选的 `Ollama` 地址

## 11. 常用命令

```bash
node dist/index.js --help
```

作用：查看 `automaton` 主程序支持的命令和参数。

```bash
node dist/index.js --status
```

作用：查看当前 automaton 的状态，包括地址、配置和运行信息。

```bash
node dist/index.js --setup
```

作用：重新运行交互式配置向导。

```bash
node packages/cli/dist/index.js status
```

作用：通过 creator CLI 查看 automaton 状态。

## 12. 用 tmux 后台运行

```bash
tmux new -s automaton
```

作用：新建一个名为 `automaton` 的 tmux 会话。  
说明：tmux 可以让程序在你退出 SSH 后继续运行。

在 tmux 会话中执行：

```bash
cd ~/automaton
```

作用：进入项目目录。

```bash
node dist/index.js --run
```

作用：在 tmux 会话中启动 automaton。

退出但不停止程序：

```text
按 Ctrl+b，然后按 d
```

作用：从 tmux 会话中脱离，让程序继续在后台运行。

重新进入 tmux：

```bash
tmux attach -t automaton
```

作用：重新连接到名为 `automaton` 的 tmux 会话。

查看 tmux 会话列表：

```bash
tmux ls
```

作用：查看当前机器上有哪些 tmux 会话。

## 13. 迁移你旧机器上的钱包和状态

如果你想保留原来的 automaton 身份，不要重新生成钱包，而是迁移旧机器的 `~/.automaton/`。

### 13.1 迁移场景下哪些命令不要执行

如果你已经从旧机器带来了完整的 `~/.automaton/`，下面这些命令不要先执行：

```bash
node dist/index.js --init
```

作用说明：这条命令会初始化或读取身份目录。  
为什么不建议先执行：如果你还没把旧机器的 `~/.automaton/` 放到新机器上，就可能先生成一套新的本地身份文件。

```bash
node dist/index.js --run
```

作用说明：这条命令会正式启动 runtime，并在首次运行时进入 setup wizard。  
为什么不建议先执行：如果旧状态还没迁移完成，首次运行可能会按“新 automaton”去初始化配置和钱包。

```bash
node dist/index.js --setup
```

作用说明：重新进入交互式配置向导。  
为什么不建议先执行：迁移场景下应优先复用旧配置，而不是重新走一遍向导。

迁移场景下，正确顺序应该是：

1. 先安装系统依赖
2. 先安装 Node.js 和 pnpm
3. 先拉取代码
4. 先执行 `pnpm install`
5. 先执行 `pnpm build`
6. 再把旧机器的 `~/.automaton/` 拷到新机器
7. 最后执行 `node dist/index.js --status`
8. 确认身份无误后，再执行 `node dist/index.js --run`

也就是说，迁移场景下：

- 前面的系统安装、Node 安装、拉代码、安装依赖、构建，这些都照常执行
- 只有“会创建或重建本地身份/配置”的命令，需要等迁移完成后再执行

旧机器上打包：

```bash
tar -czf automaton-home.tar.gz ~/.automaton
```

作用：把旧机器上的 `~/.automaton/` 整个打成压缩包，便于迁移。

把压缩包传到新机器后解压：

```bash
tar -xzf automaton-home.tar.gz -C ~
```

作用：把旧机器的 `~/.automaton/` 解压回当前用户家目录。

迁移后检查身份：

```bash
cd ~/automaton
```

作用：回到项目目录。

```bash
node dist/index.js --status
```

作用：确认新机器识别到的 automaton 身份和原来一致。

如果 `--status` 输出的地址、creator、配置都和旧机器一致，再执行：

```bash
node dist/index.js --run
```

作用：在保留原身份和状态的前提下，正式启动 automaton runtime。

迁移时重点要保留的文件包括：

- `~/.automaton/wallet.json`
- `~/.automaton/automaton.json`
- `~/.automaton/state.db`
- `~/.automaton/heartbeat.yml`
- `~/.automaton/SOUL.md`
- `~/.automaton/skills/`

注意：`wallet.json` 含私钥，必须妥善保管。

## 14. 建议的最小安全做法

- 使用单独的钱包，不要用主钱包
- 使用单独的 API keys，不要复用生产密钥
- 先用低额度 credits 或少量 USDC
- 不要把它部署在你的日常主力工作机
- 优先放在独立 Linux 服务器或 VM 上运行

## 15. 出问题时先检查什么

```bash
pnpm install
```

作用：如果依赖没装完整，重新安装依赖。

```bash
pnpm build
```

作用：如果编译产物缺失，重新构建项目。

```bash
node dist/index.js --help
```

作用：确认主程序是否至少能正常启动。

```bash
node dist/index.js --status
```

作用：确认本地状态目录和配置是否已正确加载。

```bash
curl -I https://www.google.com
```

作用：排查服务器是否能访问 Google。

```bash
curl -I https://openai.com
```

作用：排查服务器是否能访问 OpenAI。

```bash
curl -I https://api.conway.tech
```

作用：排查服务器是否能访问 Conway API。

## 16. 最短部署路径

下面这段是最短命令序列，适合你已经理解上面每一步作用后直接执行。

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl build-essential tmux
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
corepack prepare pnpm@10.28.1 --activate
cd ~
git clone https://github.com/Conway-Research/automaton.git
cd automaton
pnpm install
pnpm build
node dist/index.js --help
node dist/index.js --init
node dist/index.js --run
```

各命令作用汇总：

- `sudo apt update`：更新软件源索引
- `sudo apt upgrade -y`：升级系统软件
- `sudo apt install -y git curl build-essential tmux`：安装基础工具
- `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`：添加 Node.js 20 安装源
- `sudo apt install -y nodejs`：安装 Node.js
- `sudo corepack enable`：启用 Corepack
- `corepack prepare pnpm@10.28.1 --activate`：安装并启用指定版本 pnpm
- `cd ~`：回到家目录
- `git clone https://github.com/Conway-Research/automaton.git`：拉取代码
- `cd automaton`：进入项目目录
- `pnpm install`：安装依赖
- `pnpm build`：构建项目
- `node dist/index.js --help`：确认程序可执行
- `node dist/index.js --init`：初始化或读取钱包目录
- `node dist/index.js --run`：正式启动 automaton
