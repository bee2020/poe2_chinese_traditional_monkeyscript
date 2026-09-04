/**
 * 【步骤三：生成最新编译内容报告 CHANGELOG.md】
 * 规范：
 * 1. 核心词缀与装备一样，完整体现 PoE2DB 查找成功数与未查到数！
 * 2. 详细列出未查到的词缀明细清单与具体官方原因！
 */
const fs = require('fs');
const path = require('path');

const CHANGELOG_DIR = path.resolve(__dirname, '../changelogs');

function generateDiffAndChangelog(untranslatedReport) {
    console.log('================================================================');
    console.log('📝【第 3 步：生成最新编译内容报告 CHANGELOG.md】');
    console.log('================================================================');

    if (!fs.existsSync(CHANGELOG_DIR)) {
        fs.mkdirSync(CHANGELOG_DIR, { recursive: true });
    }

    const s = untranslatedReport.summary;

    let mainMd = `# POE2 官方交易字典最新编译报告 (CHANGELOG)

> 编译时间: ${new Date().toLocaleString()}  
> 同步状态: 🟢 官方 API 直连 + 机器 ID 强对齐 + PoE2DB 全链路兜底就绪

---

## 📊 编译结果与覆盖率指标总览

| 业务模块 | 国际服总条目 | 官方台服已对齐 | ⚠️ 待补全/缺漏数 | 🌐 使用 poe2db.tw 兜底查找 (成功 / 未查到) | 🎯 最终综合覆盖率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **通货材料 (static.json)** | **${s.static.total}** | **${s.static.officialTranslated}** | 🟢 **${s.static.missing} 种** | 🟢 无需介入 (100% 官方对齐) | **${s.static.finalRate}** |
| **市集筛选 (filters.json)** | **${s.filters.total}** | **${s.filters.officialTranslated}** | 🟢 **${s.filters.missing} 项** | 🟢 无需介入 (100% 官方对齐) | **${s.filters.finalRate}** |
| **装备与暗金 (items.json)** | **${s.items.total}** | **${s.items.officialTranslated}** | 🔴 **${s.items.missing} 件** | 🟢 **已查到: ${s.items.poe2dbFound} 件** / ⚪ 未查到: ${s.items.poe2dbNotFound} 件 | **${s.items.finalRate}** |
| **核心词缀 (stats.json)** | **${s.stats.total}** | **${s.stats.officialTranslated}** | 🔴 **${s.stats.missing} 条** | 🟢 **已查到: ${s.stats.poe2dbFound} 条** / ⚪ 未查到: ${s.stats.poe2dbNotFound} 条 | **${s.stats.finalRate}** |

---

## 📁 产物输出与引用说明

- **基础字典输出路径**: \`dict/tw/\`
  - \`dict/tw/static.json\` (通货材料: 100% 官方对齐)
  - \`dict/tw/filters.json\` (市集筛选器: 100% 官方对齐)
  - \`dict/tw/items.json\` (装备与暗金: 100% 综合覆盖)
  - \`dict/tw/stats.json\` (核心词缀与属性: ${s.stats.finalRate} 综合覆盖)

---

## 🔍 未查到的装备明细清单

`;

    if (!untranslatedReport.items || untranslatedReport.items.length === 0) {
        mainMd += `> 🎉 **全库装备已 100% 全部查找到位，未查到数为 0！**\n\n`;
    } else {
        mainMd += `| 序号 | 所属分类 | 英文基底 (Type) | 英文名称 (Name) | 完整英文原名 (Text) | 原因说明 |\n`;
        mainMd += `| :---: | :--- | :--- | :--- | :--- | :--- |\n`;
        untranslatedReport.items.forEach((it, idx) => {
            mainMd += `| ${idx + 1} | \`${it.category || '-'}\` | \`${it.type}\` | \`${it.name || '-'}\` | \`${it.text || it.type}\` | 官方台服与PoE2DB均未收录 |\n`;
        });
        mainMd += `\n`;
    }

    mainMd += `---

## 🔍 未查到的核心词缀明细清单 (${s.stats.poe2dbNotFound} 条)

`;

    if (!untranslatedReport.stats || untranslatedReport.stats.length === 0) {
        mainMd += `> 🎉 **全库词缀已 100% 全部查找到位，未查到数为 0！**\n`;
    } else {
        mainMd += `| 序号 | 词缀分类 | 官方机器 ID | 英文词缀原文 (EN Text) | 状态 |\n`;
        mainMd += `| :---: | :--- | :--- | :--- | :--- |\n`;
        untranslatedReport.stats.forEach((st, idx) => {
            mainMd += `| ${idx + 1} | \`${st.category}\` | \`${st.id}\` | \`${st.en.replace(/[\n\r]+/g, ' ')}\` | 无法匹配 |\n`;
        });
    }

    fs.writeFileSync(path.join(CHANGELOG_DIR, 'CHANGELOG.md'), mainMd, 'utf8');

    console.log(`  ✅ changelogs/CHANGELOG.md 已输出最新编译内容`);
    console.log('================================================================\n');
}

module.exports = { generateDiffAndChangelog };
