# Path of Exile 2 (POE2) 繁体中文交易行油猴脚本 🚀

[![GitHub Release](https://img.shields.io/github/v/release/bee2020/poe2_chinese_traditional_monkeyscript?color=blue&logo=github)](https://github.com/bee2020/poe2_chinese_traditional_monkeyscript/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Daily Auto Build](https://github.com/bee2020/poe2_chinese_traditional_monkeyscript/actions/workflows/auto_build_and_release.yml/badge.svg)](https://github.com/bee2020/poe2_chinese_traditional_monkeyscript/actions/workflows/auto_build_and_release.yml)

专为 **流放之路2 (Path of Exile 2, POE2)** 官方国际服交易集市打造的繁体中文本地化油猴脚本。

通过官方 API 字典数据动态提取与清洗，全面覆盖装备基底、传奇暗金、通货物品、全量词缀与天赋涂油，助你轻松畅玩国际服交易行！

---

## ✨ 核心特性

- 🎯 **100% 官方数据对齐**：直连 POE 官方 API 抓取繁中字典（覆盖 8,200+ 条词缀、3,800+ 装备与通货物品）。
- 🧬 **零死数据架构 (Zero Hardcode)**：
  - 彻底摒弃传统脚本中易过期的硬编码映射表；
  - 装备基底分类、暗金名称、属性需求（力量/敏捷/智慧）、品质全部**纯动态实时推导**；
  - 875+ 涂油附魔天赋实现动态解析，与游戏版本完全同步。
- 🔄 **云端每日全自动更新 (GitHub Actions)**：
  - 每日定时检测官方数据变动；
  - 自动运行端到端测试并编译打包；
  - 自动生成版本号并发布 GitHub Release，无需人工维护。
- ⚡ **极致性能与模块化**：
  - TypeScript 源码开发，采用 esbuild 秒级构建；
  - 零外部依赖，毫秒级 DOM 翻译响应，不卡顿、不影响集市原生筛选逻辑。

---

## 📥 快速安装使用

### 第一步：安装脚本管理器
请根据你使用的浏览器安装任意一款 Userscript 管理器扩展：
- [Tampermonkey (篡改猴 / 油猴)](https://www.tampermonkey.net/)
- [Violentmonkey (暴力猴)](https://violentmonkey.github.io/)

### 第二步：一键安装脚本
点击下方任意链接即可自动弹出安装界面：

- 👉 **[点击通过 GitHub Raw 直接安装](https://raw.githubusercontent.com/bee2020/poe2_chinese_traditional_monkeyscript/main/dist/poe_trade.user.js)**
- 👉 **[点击通过 jsDelivr 全球加速 CDN 安装](https://cdn.jsdelivr.net/gh/bee2020/poe2_chinese_traditional_monkeyscript@main/dist/poe_trade.user.js)**

### 第三步：开始使用
打开 [Path of Exile 2 官方交易集市](https://www.pathofexile.com/trade2/search/poe2)，即可看到装备名称、词缀过滤器等已全面中文化。

---

## 🛠️ 本地开发与贡献

本项目采用单仓架构，集成了数据爬虫抓取、编译打包与自动化测试。

### 常用命令

```bash
# 1. 安装项目依赖
npm install

# 2. 爬取最新 POE 官方字典（可选，已内置最新字典数据）
npm run build:dict

# 3. 同步字典并编译生成油猴脚本产物
npm run build

# 4. 运行 5 项端到端运行时质量验证
npm test

# 5. 一键执行完整流程（抓取 + 编译 + 测试）
npm run build:all
```

### 🚀 极速一键发布 (Windows)
双击根目录下的 **`push.bat`**：
- 自动完成构建打包；
- 自动运行端到端测试（通过才允许发布）；
- 自动配置 Git 与提交，秒级全自动推送到 GitHub！

---

## 🤖 自动化 CI/CD 流水线

仓库内置 `.github/workflows/auto_build_and_release.yml` 自动化流程：
1. **定时触发**：每天 UTC 0:00（北京时间早 8:00）自动唤醒；
2. **抓取清洗**：自动抓取 GGG 官方最新中英文对照；
3. **严格测试**：验证产物完整性与涂油映射无损；
4. **自动发布**：若有新更新，自动提交代码并创建新的 GitHub Release，便于自动更新。

---

## 📄 开源许可 (License)

本项目采用 [MIT License](LICENSE) 开源协议。
数据来源于 Grinding Gear Games 官方公共数据，版权归原作者所有。
