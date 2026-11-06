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

## 本地数值模板校验

运行 `npm run build` 会复用 `src/core/statTemplate.ts` 校验本地词缀模板，并输出
`temp/stat-template-audit.json`。该报告用于排查占位符、固定常量及变量顺序问题，
不能视为语义翻译正确率。

浏览器翻译仅捕获英文模板的变量，保留固定常量；无法确认的模板保留英文。
多个变量需要明确对应顺序，模块支持 `{0}`、`{1}` 编号模板；旧 `#` 模板仅自动接受
单变量及明确的双端点范围。`npm test` 会实际执行模板模块和卡片解析器进行回归检查。

## 字典统计与差异报告

- `npm run report:dict`：只根据本地已有字典重算 `build_dict/changelogs/CHANGELOG.md`，不会联网；没有历史快照时明确标记基线不可用。
- `npm run build:all`：联网构建时保存构建前快照，生成四类字典的增删改记录，并记录官方原始数据实际使用在线结果还是缓存。
- 完整差异保存到 `build_dict/changelogs/CHANGELOG.diff.json`；分类、条目、选项的排序变化不计入增删改。
- 覆盖率采用字段完整率，排除 `[DNT]` 和无可见文本的节点；物品分别统计完整、部分、待核对。专名保留原文会被列入待核对，不直接认定为错译。
- 网页补全仅按机器指纹、稳定标识或唯一卡片词缀对应，不按表格/描述行下标配对，因此部分旧补全项可能回退英文。

## 天赋说明的精确双语翻译

`passives.json` 保存按 `PassiveSkillsHash` 对齐的双语天赋说明。运行时只在天赋名称和整段英文说明完全匹配时使用，固定数字不做替换或推算；无法确认时保留英文。

`build_locale.bat` 和 GitHub 工作流的 `build:all` 均会更新该字典。首次构建需要抓取节点说明，后续只下载内容地址发生变化的节点。也可单独运行 `npm run build:passives` 更新并重新打包。

## 脚本安装地址

- **GitHub 直链**: [poe_trade.user.js](https://raw.githubusercontent.com/bee2020/poe2_chinese_traditional_monkeyscript/main/dist/poe_trade.user.js)
- **jsDelivr CDN 加速**: [poe_trade.user.js](https://cdn.jsdelivr.net/gh/bee2020/poe2_chinese_traditional_monkeyscript@main/dist/poe_trade.user.js)

- **版本更新日志**: [点击查看 CHANGELOG.md](https://github.com/bee2020/poe2_chinese_traditional_monkeyscript/blob/main/build_dict/changelogs/CHANGELOG.md)
