# POE2 繁体中文油猴脚本工程

## 目录结构

```text
poe2_chinese_traditional_monkeyscript/
├── .github/workflows/
│   └── auto_build_and_release.yml  # GitHub Actions 每日自动构建与发布
├── build_dict/                     # 官方字典抓取翻译
│   ├── raw/                        # 官方原始 JSON (en / tw)
│   ├── dict/tw/                    # 繁体 4 大字典 (items/stats/static/filters)
│   ├── changelogs/                 # 字典更新日志
│   ├── scripts/                    # 抓取与对齐脚本
│   └── pipeline.cjs                # 字典构建总入口
├── dist/
│   └── poe_trade.user.js           # 油猴脚本发布文件
├── scripts/
│   └── sync-dict.cjs               # 同步字典脚本
├── src/                            # 油猴脚本源码
│   ├── dict/                       # 属性需求与动态字典
│   └── index.ts                    # 页面翻译主逻辑
├── build.js                        # 打包脚本
├── verify_runtime.cjs              # 运行时验证脚本
└── package.json                    # 项目配置
```

## 运行指令

```bash
# 安装依赖
npm install

# 抓取官方字典 (可选)
npm run build:dict

# 构建油猴脚本
npm run build

# 运行测试验证
npm test

# 全流程执行 (抓取 + 构建 + 测试)
npm run build:all
```

## 脚本安装地址

- **GitHub 直链**: [poe_trade.user.js](https://raw.githubusercontent.com/bee2020/poe2_chinese_traditional_monkeyscript/main/dist/poe_trade.user.js)
- **jsDelivr CDN 加速**: [poe_trade.user.js](https://cdn.jsdelivr.net/gh/bee2020/poe2_chinese_traditional_monkeyscript@main/dist/poe_trade.user.js)
