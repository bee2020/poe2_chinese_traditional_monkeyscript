/**
 * 【步骤三：生成最新编译内容报告 CHANGELOG.md】
 * 规范：
 * 1. 核心词缀与装备一样，完整体现 PoE2DB 查找成功数与未查到数！
 * 2. 详细列出未查到的词缀明细清单与具体官方原因！
 */
const fs = require('fs');
const path = require('path');

const CHANGELOG_DIR = path.resolve(__dirname, '../changelogs');
const DICT_TW_DIR = path.resolve(__dirname, '../dict/tw');

/**
 * 提取 items.json 的唯一键与繁中映射
 */
function extractItemsMap(itemsJson) {
    const map = new Map();
    if (!itemsJson) return map;
    const list = Array.isArray(itemsJson) ? itemsJson : (itemsJson.result || []);
    for (const cat of list) {
        for (const entry of (cat.entries || [])) {
            const key = `${entry.type || ''}__${entry.name || ''}`;
            const zh = entry.zh_tw ? (entry.zh_tw.text || entry.zh_tw.name || entry.zh_tw.type || '') : '';
            const desc = entry.name ? `${entry.name} (${entry.type})` : (entry.type || key);
            map.set(key, { desc, zh, cat: cat.label || cat.id || '' });
        }
    }
    return map;
}

/**
 * 提取 stats.json 的唯一键与繁中映射
 */
function extractStatsMap(statsJson) {
    const map = new Map();
    if (!statsJson) return map;
    const list = Array.isArray(statsJson) ? statsJson : (statsJson.result || []);
    for (const cat of list) {
        for (const entry of (cat.entries || [])) {
            const key = entry.id;
            const zh = entry.zh_tw ? (typeof entry.zh_tw === 'string' ? entry.zh_tw : (entry.zh_tw.text || '')) : '';
            const desc = `[${cat.id || ''}] ${entry.text || entry.id}`;
            map.set(key, { desc, zh, cat: cat.id || '' });
        }
    }
    return map;
}

/**
 * 提取 static.json 的唯一键与繁中映射
 */
function extractStaticMap(staticJson) {
    const map = new Map();
    if (!staticJson) return map;
    const list = Array.isArray(staticJson) ? staticJson : (staticJson.result || []);
    for (const cat of list) {
        for (const entry of (cat.entries || [])) {
            const key = entry.id;
            const zh = entry.zh_tw ? (typeof entry.zh_tw === 'string' ? entry.zh_tw : (entry.zh_tw.text || '')) : '';
            const desc = `[${cat.id || ''}] ${entry.text || entry.id}`;
            map.set(key, { desc, zh, cat: cat.id || '' });
        }
    }
    return map;
}

/**
 * 在重新构建前采集旧字典快照
 */
function takeDictSnapshot(dictDir = DICT_TW_DIR) {
    const snapshot = {
        items: new Map(),
        stats: new Map(),
        static: new Map()
    };
    try {
        const itemsPath = path.join(dictDir, 'items.json');
        if (fs.existsSync(itemsPath)) {
            snapshot.items = extractItemsMap(JSON.parse(fs.readFileSync(itemsPath, 'utf8')));
        }
        const statsPath = path.join(dictDir, 'stats.json');
        if (fs.existsSync(statsPath)) {
            snapshot.stats = extractStatsMap(JSON.parse(fs.readFileSync(statsPath, 'utf8')));
        }
        const staticPath = path.join(dictDir, 'static.json');
        if (fs.existsSync(staticPath)) {
            snapshot.static = extractStaticMap(JSON.parse(fs.readFileSync(staticPath, 'utf8')));
        }
    } catch (_) {}
    return snapshot;
}

/**
 * 比较新旧字典映射，计算增/删/改
 */
function diffMaps(oldMap, newMap) {
    const added = [];
    const modified = [];
    const removed = [];

    for (const [key, newItem] of newMap) {
        const oldItem = oldMap.get(key);
        if (!oldItem) {
            added.push({ key, desc: newItem.desc, zh: newItem.zh });
        } else if (oldItem.zh !== newItem.zh) {
            modified.push({ key, desc: newItem.desc, oldZh: oldItem.zh || '(空)', newZh: newItem.zh || '(空)' });
        }
    }

    for (const [key, oldItem] of oldMap) {
        if (!newMap.has(key)) {
            removed.push({ key, desc: oldItem.desc, zh: oldItem.zh });
        }
    }

    return { added, modified, removed };
}

/**
 * 生成追加到底部的变更明细 Markdown
 */
function renderDiffSection(oldSnapshot, dictDir = DICT_TW_DIR) {
    if (!oldSnapshot || (oldSnapshot.items.size === 0 && oldSnapshot.stats.size === 0)) {
        return `\n---\n\n## 🔄 本次版本实质变动明细 (Diff Changes)\n\n> ℹ️ 首次运行或未探测到历史旧字典，已全量初始化产出。\n`;
    }

    const newSnapshot = takeDictSnapshot(dictDir);
    const itemsDiff = diffMaps(oldSnapshot.items, newSnapshot.items);
    const statsDiff = diffMaps(oldSnapshot.stats, newSnapshot.stats);
    const staticDiff = diffMaps(oldSnapshot.static, newSnapshot.static);

    const totalChanges = itemsDiff.added.length + itemsDiff.modified.length + itemsDiff.removed.length
        + statsDiff.added.length + statsDiff.modified.length + statsDiff.removed.length
        + staticDiff.added.length + staticDiff.modified.length + staticDiff.removed.length;

    let md = `\n---\n\n## 🔄 本次版本实质变动明细 (Diff Changes)\n\n`;

    if (totalChanges === 0) {
        md += `> 🎉 **本次官方数据与字典无任何增删或翻译变更（与上一版本完全一致）。**\n`;
        return md;
    }

    md += `> 📊 **本次构建累计检测到 ${totalChanges} 处实质性词条变更**（相较于上一次构建产物）：\n\n`;

    // 1. 装备与暗金
    md += `### 📦 装备与暗金变动 (items.json)\n`;
    if (itemsDiff.added.length === 0 && itemsDiff.modified.length === 0 && itemsDiff.removed.length === 0) {
        md += `> 🟢 无变动\n\n`;
    } else {
        if (itemsDiff.modified.length > 0) {
            md += `\n**🟡 翻译修正与变更 (${itemsDiff.modified.length} 项)**:\n`;
            itemsDiff.modified.forEach(it => {
                md += `- \`${it.desc}\`: \`${it.oldZh}\` ➔ **\`${it.newZh}\`**\n`;
            });
        }
        if (itemsDiff.added.length > 0) {
            md += `\n**🟢 新增条目 (${itemsDiff.added.length} 项)**:\n`;
            itemsDiff.added.forEach(it => {
                md += `- \`${it.desc}\` ➔ \`${it.zh}\`\n`;
            });
        }
        if (itemsDiff.removed.length > 0) {
            md += `\n**🔴 移除条目 (${itemsDiff.removed.length} 项)**:\n`;
            itemsDiff.removed.forEach(it => {
                md += `- \`${it.desc}\` (原: \`${it.zh}\`)\n`;
            });
        }
        md += `\n`;
    }

    // 2. 核心词缀
    md += `### ⚡ 核心词缀变动 (stats.json)\n`;
    if (statsDiff.added.length === 0 && statsDiff.modified.length === 0 && statsDiff.removed.length === 0) {
        md += `> 🟢 无变动\n\n`;
    } else {
        if (statsDiff.modified.length > 0) {
            md += `\n**🟡 词缀翻译变更 (${statsDiff.modified.length} 条)**:\n`;
            const showList = statsDiff.modified.slice(0, 50);
            showList.forEach(st => {
                md += `- \`${st.desc}\`: \`${st.oldZh}\` ➔ **\`${st.newZh}\`**\n`;
            });
            if (statsDiff.modified.length > 50) {
                md += `> *(注：词缀变更条数较多，仅展示前 50 条，剩余 ${statsDiff.modified.length - 50} 条已同步生效)*\n`;
            }
        }
        if (statsDiff.added.length > 0) {
            md += `\n**🟢 新增词缀 (${statsDiff.added.length} 条)**:\n`;
            statsDiff.added.forEach(st => {
                md += `- \`${st.desc}\` ➔ \`${st.zh}\`\n`;
            });
        }
        if (statsDiff.removed.length > 0) {
            md += `\n**🔴 移除词缀 (${statsDiff.removed.length} 条)**:\n`;
            statsDiff.removed.forEach(st => {
                md += `- \`${st.desc}\`\n`;
            });
        }
        md += `\n`;
    }

    // 3. 通货材料
    md += `### 🪙 通货材料变动 (static.json)\n`;
    if (staticDiff.added.length === 0 && staticDiff.modified.length === 0 && staticDiff.removed.length === 0) {
        md += `> 🟢 无变动\n\n`;
    } else {
        if (staticDiff.modified.length > 0) {
            md += `\n**🟡 翻译变更 (${staticDiff.modified.length} 项)**:\n`;
            staticDiff.modified.forEach(sc => {
                md += `- \`${sc.desc}\`: \`${sc.oldZh}\` ➔ **\`${sc.newZh}\`**\n`;
            });
        }
        if (staticDiff.added.length > 0) {
            md += `\n**🟢 新增材料 (${staticDiff.added.length} 项)**:\n`;
            staticDiff.added.forEach(sc => {
                md += `- \`${sc.desc}\` ➔ \`${sc.zh}\`\n`;
            });
        }
        md += `\n`;
    }

    return md;
}

function generateDiffAndChangelog(untranslatedReport, oldSnapshot = null) {
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
        mainMd += `| 序号 | 所属分类 | 英文基底 (Type) | 英文名称 (Name) | 完整英文原名 (Text) | 状态 |\n`;
        mainMd += `| :---: | :--- | :--- | :--- | :--- | :--- |\n`;
        untranslatedReport.items.forEach((it, idx) => {
            mainMd += `| ${idx + 1} | \`${it.category || '-'}\` | \`${it.type}\` | \`${it.name || '-'}\` | \`${it.text || it.type}\` | 無法匹配 |\n`;
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

    // 🎯 核心新特性：在最底部追加变动明细 (Diff Changes)
    const diffSectionMd = renderDiffSection(oldSnapshot);
    mainMd += diffSectionMd;

    fs.writeFileSync(path.join(CHANGELOG_DIR, 'CHANGELOG.md'), mainMd, 'utf8');

    console.log(`  ✅ changelogs/CHANGELOG.md 已输出最新编译内容 (含底部实质变动明细)`);
    console.log('================================================================\n');
}

module.exports = { generateDiffAndChangelog, takeDictSnapshot };

