# Path of Exile 2 官方交易字典 (POE2 Trade Dictionary)

本项目为《流放之路 2》（Path of Exile 2）官方交易市集（`trade2`）的**全自动双源同步与多语言翻译字典仓库**。

---

## 🌟 项目特性

1. **100% 官方正版双源直连**：
   - 国际服英文数据直连：`https://www.pathofexile.com/api/trade2/data/*`
   - 台服繁中数据直连：`https://pathofexile.tw/api/trade2/data/*`
2. **0 外部老项目依赖**：不依赖任何第三方人工老字典，纯粹基于官方机器全局 ID 自动构建。
3. **严格与官网 1:1 保持一致**：`dict/tw/` 目录下**严格只输出官方对应的 4 个核心 JSON**，格式与官网原生结构完全一致。
4. **GitHub Actions 每日全自动同步**：配置了 CI 工作流，每天自动检测官网更新并自动推送到仓库。

---

## 📁 目录结构

```text
poe2-trade-dictionary/
├── .github/workflows/
│   └── auto_sync.yml            # GitHub Actions 每日自动同步与提交工作流
├── raw/                         # 官方原始一手原件备份
│   ├── raw_en/                  # 国际服 4 大英文原版 JSON (items, stats, static, filters)
│   └── raw_tw/                  # 台服 4 大繁中原版 JSON (items, stats, static, filters)
├── dict/                        # 生产级字典发布目录
│   └── tw/                      # 🇹🇼 繁体中文专属目录 (严格仅有 4 个文件，格式与官网 1:1)
│       ├── items.json           # 装备基底与暗金 (注入繁中 text，如 "魔血 實用腰帶")
│       ├── stats.json           # 核心词缀与属性 (官方全局机器 ID 强绑定)
│       ├── static.json          # 通货材料与道具 (官方机器 ID 强绑定)
│       └── filters.json         # 市集筛选器配置 (官方选项 ID 强绑定)
├── changelogs/                  # 增量审计与更新日志
│   ├── diff_latest.json         # 机器可读的增量指标
│   └── CHANGELOG.md             # 人类可读的版本日志
├── scripts/                     # 核心自动化构建脚本
│   ├── fetch.cjs                # [第 1 步] 双源官方 API 实时拉取
│   ├── build.cjs                # [第 2 步] 官方对齐与 dict/tw/ 生成
│   └── diff.cjs                 # [第 3 步] 增量变动检测与日志生成
├── pipeline.cjs                 # 本地一键总控入口
└── package.json
```

---

## 🚀 本地运行指令

执行一键全自动流水线：
```bash
node pipeline.cjs
```

---

## 🌐 第三方插件与油猴脚本 CDN 高速引用方法

仓库发布到 GitHub 后，任何网页工具或油猴插件可直接通过全球 CDN（如 jsDelivr）免翻墙秒级调用：

```javascript
// 获取最新繁中装备基底与暗金：
fetch('https://cdn.jsdelivr.net/gh/你的GitHub用户名/poe2-trade-dictionary@main/dict/tw/items.json')
  .then(res => res.json())
  .then(items => console.log('已加载官方繁中装备数据', items));

// 获取最新繁中词缀属性：
fetch('https://cdn.jsdelivr.net/gh/你的GitHub用户名/poe2-trade-dictionary@main/dict/tw/stats.json')
  .then(res => res.json())
  .then(stats => console.log('已加载官方繁中词缀数据', stats));
```
