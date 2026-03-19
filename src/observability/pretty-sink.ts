/**
 * Pretty log sink
 *
 * Human-readable terminal output for --run mode.
 * Replaces raw JSON stdout with colored, structured log lines.
 * Register via: StructuredLogger.setSink(prettySink)
 */

import chalk from "chalk";
import type { LogEntry } from "../types.js";

const accent = chalk.rgb(131, 127, 255);

// Map bracket prefixes in loop messages to styles
const PREFIX_STYLES: Array<[RegExp, (label: string, rest: string) => string]> = [
  [/^\[WAKE UP\]/, (l, r) => accent.bold(l) + " " + chalk.white(r)],
  [/^\[SLEEP\]/, (l, r) => chalk.blue.dim(l) + " " + chalk.dim(r)],
  [/^\[THINK\]/, (l, r) => accent.dim(l) + " " + chalk.dim(r)],
  [/^\[THOUGHT\]/, (l, r) => chalk.dim(l) + " " + chalk.white(r)],
  [/^\[TOOL\]/, (l, r) => chalk.magenta(l) + " " + chalk.white(r)],
  [/^\[TOOL RESULT\]/, (l, r) => {
    const isError = r.startsWith("ERROR:") || r.includes(": ERROR:");
    return (isError ? chalk.red(l) : chalk.green(l)) + " " + (isError ? chalk.red(r) : chalk.dim(r));
  }],
  [/^\[CRITICAL\]/, (l, r) => chalk.red.bold(l) + " " + chalk.red(r)],
  [/^\[FATAL\]/, (l, r) => chalk.red.bold(l) + " " + chalk.red(r)],
  [/^\[ERROR\]/, (l, r) => chalk.red(l) + " " + chalk.red(r)],
  [/^\[LOOP\]/, (l, r) => chalk.yellow(l) + " " + chalk.yellow(r)],
  [/^\[LOOP END\]/, (l, r) => accent(l) + " " + chalk.dim(r)],
  [/^\[IDLE\]/, (l, r) => chalk.dim(l) + " " + chalk.dim(r)],
  [/^\[ORCHESTRATOR\]/, (l, r) => chalk.cyan(l) + " " + chalk.white(r)],
  [/^\[AUTO-TOPUP\]/, (l, r) => chalk.green.bold(l) + " " + chalk.green(r)],
  [/^\[CYCLE LIMIT\]/, (l, r) => chalk.yellow(l) + " " + chalk.dim(r)],
  [/^\[API_UNREACHABLE\]/, (l, r) => chalk.yellow(l) + " " + chalk.dim(r)],
  [/^\[INBOX\]/, (l, r) => chalk.dim(l) + " " + chalk.dim(r)],
];

const LEVEL_STYLES: Record<string, (s: string) => string> = {
  debug: chalk.gray,
  info: chalk.white,
  warn: chalk.yellow,
  error: chalk.red,
  fatal: chalk.red.bold,
};

function translateMessage(message: string): string | null {
  const rules: Array<[RegExp, (...groups: string[]) => string]> = [
    [/^\[WAKE UP\]\s+(.+?) is alive\. Credits: \$(.+)$/s, (name, credits) => `[唤醒] ${name} 已恢复运行。Credits：$${credits}`],
    [/^\[THINK\]\s+Routing inference \(tier: (.+?), model: (.+?)\)\.\.\.$/s, (tier, model) => `[思考] 正在路由推理。层级：${tier}，模型：${model}`],
    [/^\[TOOL\]\s+(.+)$/s, (rest) => `[工具] ${rest}`],
    [/^\[TOOL RESULT\]\s+(.+)$/s, (rest) => `[工具结果] ${rest}`],
    [/^\[THOUGHT\]\s+(.+)$/s, (rest) => `[想法] ${rest}`],
    [/^\[CRITICAL\]\s+(.+)$/s, (rest) => `[严重] ${rest}`],
    [/^\[ERROR\]\s+(.+)$/s, (rest) => `[错误] ${rest}`],
    [/^\[FATAL\]\s+(.+)$/s, (rest) => `[致命] ${rest}`],
    [/^\[IDLE\]\s+(.+)$/s, (rest) => `[空闲] ${rest}`],
    [/^\[LOOP\]\s+(.+)$/s, (rest) => `[循环] ${rest}`],
    [/^\[LOOP END\]\s+Agent loop finished\. State: (.+)$/s, (state) => `[循环结束] Agent 主循环结束。状态：${state}`],
    [/^\[LOOP\]\s+Maintenance loop detected: (.+)$/s, (rest) => `[循环] 检测到维护型空转：${rest}`],
    [/^\[LOOP\]\s+Repetitive pattern detected: (.+)$/s, (rest) => `[循环] 检测到重复模式：${rest}`],
    [/^\[[^\]]+\]\s+State: (.+)$/s, (state) => `状态：${state}`],
    [/^\[[^\]]+\]\s+Shutting down\.\.\.$/s, () => `正在关闭...`],
    [/^\[[^\]]+\]\s+Turn ([A-Z0-9]+): (\d+) tools, (\d+) tokens$/s, (turnId, tools, tokens) => `回合 ${turnId}：调用了 ${tools} 个工具，总计 ${tokens} tokens`],
    [/^Bootstrap topup skipped: USDC balance \$(.+) below minimum tier \(\$(.+)\)$/s, (balance, minimum) => `启动补充已跳过：USDC 余额 $${balance}，低于最小档位要求 $${minimum}`],
    [/^Bootstrap topup: credits=\$(.+), USDC=\$(.+), buying \$(.+)$/s, (credits, usdc, amount) => `启动补充：当前 credits $${credits}，USDC $${usdc}，准备购买 $${amount}`],
    [/^Attempting credit topup: \$(.+) USD for (.+)$/s, (amount, address) => `正在尝试充值 credits：金额 $${amount}，钱包地址 ${address}`],
    [/^Credit topup successful: \$(.+) USD → (.+) credits cents$/s, (amount, cents) => `充值成功：$${amount} USD -> ${cents} credits cents`],
    [/^\[[^\]]+\]\s+Bootstrap topup: \+\$(.+) credits from USDC$/s, (amount) => `启动时已通过 USDC 补充 credits：+$${amount}`],
    [/^Daemon started\. Tick interval: (.+) \(from config\)$/s, (interval) => `守护进程已启动。Tick 间隔：${interval}（来自配置）`],
    [/^\[[^\]]+\]\s+Heartbeat daemon started\.$/s, () => `Heartbeat 守护进程已启动。`],
    [/^\[HEARTBEAT\]\s+Wake request: (.+)$/s, (reason) => `[心跳] 唤醒请求：${reason}`],
  ];

  for (const [pattern, formatter] of rules) {
    const match = message.match(pattern);
    if (match) {
      return formatter(...match.slice(1));
    }
  }

  if (message.startsWith("State: ")) {
    return `状态：${message.slice("State: ".length)}`;
  }

  return null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return chalk.dim(`${hh}:${mm}:${ss}`);
}

function formatMessage(message: string): string {
  const bracketMatch = message.match(/^(\[[A-Z][A-Z _-]*\])(.*)/s);
  if (bracketMatch) {
    const label = bracketMatch[1];
    const rest = bracketMatch[2].trim();
    for (const [pattern, style] of PREFIX_STYLES) {
      if (pattern.test(label)) {
        return style(label, rest);
      }
    }
    return accent(label) + " " + rest;
  }
  return chalk.white(message);
}

export function prettySink(entry: LogEntry): void {
  try {
    const time = formatTime(entry.timestamp);
    const levelFn = LEVEL_STYLES[entry.level] ?? chalk.white;
    const level = levelFn(entry.level.toUpperCase().padEnd(5));
    const mod = chalk.dim(entry.module.padEnd(12));
    const msg = formatMessage(entry.message);

    let line = `${time} ${level} ${mod} ${msg}`;
    const translated = translateMessage(entry.message);

    if (translated) {
      line += "\n" + chalk.cyan("  " + translated);
    }

    if (entry.error) {
      line += "\n" + chalk.red("  " + entry.error.message);
    }

    process.stdout.write(line + "\n");
  } catch {
    process.stdout.write(entry.message + "\n");
  }
}
