# POE2 繁体中文油猴脚本工程

## 目录结构

```text
poe2_chinese_traditional_monkeyscript/
├── .github/
│   └── workflows/
│       └── auto_build_and_release.yml  # GitHub Actions 每日定时构建与发布流水线
├── build_dict/                         # 官方字典抓取与清洗子系统
│   ├── raw/                            # 官方一手原始 JSON 备份 (en / tw)
│   ├── dict/tw/                        # 清洗后的生产级 4 大字典 (items/stats/static/filters)
│   ├── changelogs/                     # 字典增量审计与版本日志
│   ├── scripts/                        # fetch / build / diff 抓取脚本
│   └── pipeline.cjs                    # 字典自动化流水线总入口
├── dist/
│   └── poe_trade.user.js               # 编译产物 (油猴脚本最终发布包)
├── scripts/
│   └── sync-dict.cjs                   # 自动将最新字典同步并内嵌至工程
├── src/                                # 油猴脚本 TypeScript 业务源码
│   ├── dict/                           # 运行时动态字典与属性需求字典
│   └── index.ts                        # 页面 DOM 拦截与翻译主逻辑
├── build.js                            # esbuild 极速打包脚本
├── verify_runtime.cjs                  # 5 项端到端运行时质量回归验证
├── push_to_github.py                   # GitHub 全自动打包、测试与推送脚本
├── push.bat                            # Windows 双击一键推送入口
└── package.json                        # 项目依赖与运行脚本配置
```

## 运行指令

```bash
# 1. 安装依赖
npm install

# 2. 爬取最新官方字典 (可选)
npm run build:dict

# 3. 同步字典并打包油猴脚本
npm run build

# 4. 执行端到端回归测试
npm test

# 5. 全流程一键执行 (抓取 + 构建 + 测试)
npm run build:all
```

### 🚀 一键发布上线 (Windows)
直接双击根目录下的 **`push.bat`**：
> 自动完成打包构建 -> 自动回归测试 -> 自动提交 -> 自动推送到 GitHub。

## 脚本安装地址

- **GitHub 直链**: [poe_trade.user.js](https://raw.githubusercontent.com/bee2020/poe2_chinese_traditional_monkeyscript/main/dist/poe_trade.user.js)
- **jsDelivr CDN 加速**: [poe_trade.user.js](https://cdn.jsdelivr.net/gh/bee2020/poe2_chinese_traditional_monkeyscript@main/dist/poe_trade.user.js)
