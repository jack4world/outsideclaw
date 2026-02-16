# outsideclaw

户外安全助手（基于 **OpenClaw**）。目标：让 LLM agent 通过结构化数据与确定性计算，帮助人类**减少迷路与恶劣天气等风险**。

## 徒步爱好者的痛点
- **容易迷路**：岔路多、夜间/起雾时方向感下降
- **天气变化快**：山脊风、雾、降温、降雨的突变会放大风险
- **信号/电量不稳定**：关键时刻没网、App 打不开或耗电太快
- **信息分散**：路线、装备、风险点、报平安流程难以一体化

## 核心功能（当前）
- **导入路线**：GPX/KML → 稳定 `routeId`（内容 hash 去重）
- **偏航纠正**（低 token）：方向 + 距离 + 建议前进距离（确定性计算，不靠 LLM）
- **关键节点提醒**：最陡段/山脊高点/下撤开始/终点等风险点提醒（`ALERT`）
- **天气剧变预警**：风/阵风/能见度/降雨/降温突变（`WX ALERT`，Open‑Meteo，无 key）
- **路线分享**：可移植 bundle（`.tar.gz`）在 outsideclaw agent 之间互相导入
- **本地数据库**（SQLite）：session + 轨迹点采集 + 风险事件记录（本地优先）

## OpenClaw 一键整合（推荐）
> 你只需要在 OpenClaw 里安装一个 skill，然后跑一条命令。

### 1) 安装 skill
```bash
clawhub install trail-nav-telegram
```

### 2) 一键安装 outsideclaw + 自动写入 OpenClaw 配置 + 可选重启
在你的 OpenClaw 配置文件路径已知的情况下（假设为 `/path/to/openclaw.config.json`）：
```bash
# 进入 skill 目录后执行（或按你的 OpenClaw skills 路径找到 scripts/）
bash scripts/openclaw_oneclick_setup.sh --config /path/to/openclaw.config.json --restart
```

这个一键命令会：
- 安装/更新 outsideclaw 到 `~/.outsideclaw/app/outsideclaw`
- 初始化本地 DB 与 routes 目录
- patch OpenClaw 配置（自动生成 `.bak` 备份）
- （可选）重启 OpenClaw gateway

## License
MIT
