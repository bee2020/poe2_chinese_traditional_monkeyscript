/** 四类字典的结构化快照、差异及真实覆盖率报告。 */
const fs = require('fs');
const path = require('path');
const { summarizeItems, summarizeEntries, summarizeFilters, translated, itemState } = require('./utils/report_util.cjs');
const { auditStatTemplates } = require('../../scripts/stat-template-tools.cjs');
const DICT_TW_DIR = path.resolve(__dirname, '../dict/tw');
const CHANGELOG_DIR = path.resolve(__dirname, '../changelogs');
const KINDS = ['items', 'stats', 'static', 'filters'];

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
const stable = value => JSON.stringify(canonical(value));
const md = value => String(value ?? '').replace(/[&<>|`]/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '|': '&#124;', '`': '&#96;' })[char]).replace(/[\r\n]+/g, ' ');

function extractMap(data, kind) {
    const map = new Map();
    const put = (key, value, desc) => {
        const id = stable(key);
        const { zh_tw, ...original } = value;
        let translation = zh_tw || {};
        let metadata = {};
        if (translation && typeof translation === 'object') {
            const { source, ...text } = translation;
            translation = text;
            if (source !== undefined) metadata = { source };
        }
        const record = { desc, original, translation, metadata };
        if (map.has(id)) {
            const { occurrences, ...existing } = map.get(id);
            if (stable(existing) !== stable(record)) throw new Error(`${kind} 存在无法区分的冲突标识：${id}`);
            map.get(id).occurrences++;
        } else map.set(id, { ...record, occurrences: 1 });
    };
    if (!Array.isArray(data)) {
        const { result, ...header } = data;
        put(['root'], header, '接口根节点');
    }
    for (const cat of Array.isArray(data) ? data : data.result || []) {
        const { entries, filters, ...header } = cat;
        put(['category', cat.id], header, `[${cat.id}] 分类`);
        const list = entries || filters || [];
        const counts = new Map();
        for (const entry of list) counts.set(entry.id, (counts.get(entry.id) || 0) + 1);
        for (const entry of list) {
            const identity = kind === 'items' ? [entry.type || '', entry.name || '']
                : counts.get(entry.id) > 1 ? [entry.id, entry.text || '', entry.type || ''] : entry.id;
            const { option, ...body } = entry;
            const desc = `[${cat.id}] ${entry.text || entry.title || entry.name || entry.type || entry.id}`;
            put(['entry', cat.id, identity], body, desc);
            if (option) {
                const { options, ...settings } = option;
                put(['option-config', cat.id, identity], settings, `${desc} 选项配置`);
                for (const opt of options || []) put(['option', cat.id, identity, opt.id], opt, `${desc} / ${opt.id}`);
            }
        }
    }
    return map;
}

function takeDictSnapshot(dictDir = DICT_TW_DIR) {
    const snapshot = { available: [] };
    for (const kind of KINDS) {
        const file = path.join(dictDir, `${kind}.json`);
        snapshot[kind] = new Map();
        if (!fs.existsSync(file)) continue;
        // 文件损坏应中止，不将读取失败伪装成全量新增。
        snapshot[kind] = extractMap(JSON.parse(fs.readFileSync(file, 'utf8')), kind);
        snapshot.available.push(kind);
    }
    return snapshot;
}

function diffMaps(oldMap, newMap) {
    const result = { added: [], removed: [], modified: [] };
    for (const [key, value] of newMap) {
        const old = oldMap.get(key);
        if (!old) result.added.push({ key, ...value });
        else {
            const fields = ['original', 'translation', 'metadata', 'occurrences'].filter(field => stable(old[field]) !== stable(value[field]));
            if (fields.length) result.modified.push({ key, desc: value.desc, fields, before: old, after: value });
        }
    }
    for (const [key, value] of oldMap) if (!newMap.has(key)) result.removed.push({ key, ...value });
    for (const list of Object.values(result)) list.sort((a, b) => a.key.localeCompare(b.key));
    return result;
}

function compareSnapshots(oldSnapshot, newSnapshot) {
    return Object.fromEntries(KINDS.map(kind => [kind, diffMaps(oldSnapshot?.[kind] || new Map(), newSnapshot[kind])]));
}

const MODULES = { items: '📦 装备与暗金', stats: '⚡ 核心词缀', static: '🪙 通货材料', filters: '🔎 市集筛选' };
const FIELD_NAMES = { name: '名称', type: '基底', text: '文本', title: '标题', label: '分类名称', source: '数据来源', occurrences: '重复次数' };
const code = value => `<code>${md(value === undefined || value === null || value === '' ? '（空）' : value)}</code>`;

function leafChanges(before, after, prefix = '') {
    if (stable(before) === stable(after)) return [];
    if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key =>
            leafChanges(before[key], after[key], prefix ? `${prefix}.${key}` : key));
    }
    const readable = value => {
        if (value && typeof value === 'object') {
            if (Array.isArray(value)) return value.map(readable).join('、');
            return Object.entries(value).map(([key, child]) => `${FIELD_NAMES[key] || key}：${readable(child)}`).join('；');
        }
        return value;
    };
    return [{ field: prefix, before: readable(before), after: readable(after) }];
}

function renderDiffSection(oldSnapshot, newSnapshot, changes) {
    let text = '\n---\n\n## 🔄 本次版本实质变动明细 (Diff Changes)\n\n';
    if (!oldSnapshot || !oldSnapshot.available?.length) {
        return text + '> ℹ️ 未提供可用历史快照；本次仅生成报告，不能判断相较上次的变化。\n';
    }
    const visibleFields = new Set(['name', 'type', 'text', 'title', 'label']);
    const visibleRows = (change, kind) => {
        const rows = [];
        for (const field of ['translation', 'original']) {
            if (!change.fields.includes(field)) continue;
            let leaves = leafChanges(change.before[field], change.after[field]).filter(row => visibleFields.has(row.field));
            if (kind === 'items' && leaves.some(row => row.field === 'name' || row.field === 'type')) leaves = leaves.filter(row => row.field !== 'text');
            rows.push(...leaves.map(row => ({ ...row, original: field === 'original' })));
        }
        return rows;
    };
    for (const kind of ['items', 'stats', 'static', 'filters']) {
        const diff = changes[kind];
        const content = diff.modified.map(change => ({ change, rows: visibleRows(change, kind) })).filter(value => value.rows.length);
        const visibleEntry = row => row.original && ['name', 'type', 'text', 'title', 'label'].some(field => row.original[field]);
        const added = diff.added.filter(visibleEntry);
        const removed = diff.removed.filter(visibleEntry);
        text += `### ${MODULES[kind]}变动 (${kind}.json)\n\n`;
        if (!added.length && !removed.length && !content.length) {
            text += '> 🟢 无内容变动\n\n';
            continue;
        }
        if (content.length) {
            text += `**🟡 翻译与原文变更 (${content.length} 项)**\n\n`;
            for (const { change, rows } of content.slice(0, 50)) {
                for (const row of rows) {
                    const label = row.original ? ' · 英文原文' : rows.length > 1 || ['name', 'type'].includes(row.field) ? ` · ${FIELD_NAMES[row.field]}` : '';
                    text += `- ${code(change.desc)}${label}：${code(row.before)} ➜ **${code(row.after)}**\n`;
                }
            }
            text += '\n';
            if (content.length > 50) text += `> 仅展示前 50 项，其余 ${content.length - 50} 项见完整差异文件。\n\n`;
        }
        for (const [rows, label] of [[added, '🟢 新增'], [removed, '🔴 删除：']]) {
            if (!rows.length) continue;
            text += `**${label} (${rows.length} 项)**\n\n`;
            for (const change of rows.slice(0, 50)) {
                const value = change.translation.text || change.translation.name || change.translation.type || change.translation.title || change.translation.label;
                text += `- ${code(change.desc)}${value ? ` ➜ ${code(value)}` : ''}\n`;
            }
            text += '\n';
        }
    }
    return text + '[完整差异数据](CHANGELOG.diff.json)\n';
}

/** 用已保存的差异恢复原基线，仅用于当前产物仍匹配时重新排版。 */
function restoreBaseline(saved, snapshot) {
    if (!saved?.baselineAvailable || !saved.changes) return null;
    const baseline = { available: [...snapshot.available] };
    for (const kind of KINDS) {
        const diff = saved.changes[kind];
        if (!diff || !['added', 'removed', 'modified'].every(key => Array.isArray(diff[key]))) return null;
        baseline[kind] = new Map(snapshot[kind]);
        for (const row of diff.added) {
            const { key, ...value } = row;
            if (stable(snapshot[kind].get(key)) !== stable(value)) return null;
            baseline[kind].delete(key);
        }
        for (const row of diff.removed) {
            const { key, ...value } = row;
            if (snapshot[kind].has(key)) return null;
            baseline[kind].set(key, value);
        }
        for (const row of diff.modified) {
            if (stable(snapshot[kind].get(row.key)) !== stable(row.after)) return null;
            baseline[kind].set(row.key, row.before);
        }
    }
    return baseline;
}

function buildReportFromDictionaries(dictDir = DICT_TW_DIR) {
    const data = Object.fromEntries(KINDS.map(kind => [kind, JSON.parse(fs.readFileSync(path.join(dictDir, `${kind}.json`), 'utf8'))]));
    const summary = {
        items: summarizeItems(data.items), stats: summarizeEntries(data.stats),
        static: summarizeEntries(data.static), filters: summarizeFilters(data.filters)
    };
    summary.stats.templateAudit = auditStatTemplates(data.stats);
    return { summary, sourceNote: '基于本地已有字典重算；本操作未联网抓取，不代表上游数据已更新。' };
}

function generateDiffAndChangelog(report, oldSnapshot = null, options = {}) {
    const dictDir = options.dictDir || DICT_TW_DIR;
    const outputDir = options.outputDir || CHANGELOG_DIR;
    // 报告由实际产物重算，避免调用方传入过期或字段不匹配的计数。
    const { summary } = buildReportFromDictionaries(dictDir);
    const now = options.now || new Date();
    const officialCount = kind => {
        let count = 0;
        const map = extractMap(JSON.parse(fs.readFileSync(path.join(dictDir, `${kind}.json`), 'utf8')), kind);
        for (const [key, record] of map) {
            const node = JSON.parse(key)[0];
            if (kind === 'filters' ? !['category', 'entry', 'option'].includes(node) : node !== 'entry') continue;
            if (!String(record.metadata.source || '').startsWith('official')) continue;
            const complete = kind === 'items' ? itemState({ ...record.original, zh_tw: record.translation }) === 'complete'
                : !!(record.original.text || record.original.title || record.original.label) && translated(record.original.text || record.original.title || record.original.label,
                    record.translation.text || record.translation.title || record.translation.label);
            if (complete) count += record.occurrences;
        }
        return count;
    };
    let text = `# POE2 官方交易字典最新编译报告 (CHANGELOG)\n\n> 🕒 报告时间（北京时间）：${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}\n\n`;
    text += '---\n\n## 📊 编译结果与覆盖率指标总览\n\n';
    text += '| 业务模块 | 有效总条目 | 官方台服完整对齐 | ⚠️ 待补全/保留原文 | 🌐 其他来源补全（完整 / 部分） | 🎯 字段完整率 |\n| :--- | ---: | ---: | ---: | :--- | ---: |\n';
    const order = ['static', 'filters', 'items', 'stats'];
    for (const kind of order) {
        const s = summary[kind];
        const official = officialCount(kind);
        const pending = s.partial + s.missing;
        const supplemented = s.complete - official;
        const fallback = supplemented || s.partial ? `完整 ${supplemented} / 部分 ${s.partial}` : '🟢 无需补全';
        text += `| **${MODULES[kind]}** (${kind}.json) | **${s.eligible}** | ${official} | ${pending ? '🟡' : '🟢'} ${pending} 项 | ${fallback} | **${s.finalRate}** |\n`;
    }
    text += '\n> 已排除占位项及无可见文本项；物品按名称和基底共同统计。完整率反映字段齐备程度，不代表全部译文已验证。\n';
    text += '\n---\n\n## 📁 产物输出与引用说明\n\n- **基础字典输出路径**：`dict/tw/`\n';
    for (const kind of order) text += `  - \`dict/tw/${kind}.json\`（${MODULES[kind].replace(/^\S+ /, '')}：${summary[kind].finalRate} 字段完整率）\n`;
    const itemRows = summary.items.untranslated;
    text += `\n---\n\n## 🔍 待补全的装备明细清单 (${itemRows.length} 项)\n\n`;
    if (!itemRows.length) text += '> ✅ 按字段完整性检查，当前没有待补全装备。\n';
    else {
        text += '| 序号 | 分类 | 英文物品 | 待补全字段 | 状态 |\n| :---: | :--- | :--- | :--- | :--- |\n';
        itemRows.forEach((row, index) => {
            text += `| ${index + 1} | ${code(row.category)} | ${code(row.text || [row.name, row.type].filter(Boolean).join(' '))} | ${row.missingFields.map(field => FIELD_NAMES[field]).join('、')} | ${row.state === 'partial' ? '部分翻译' : '缺失或保留原文'} |\n`;
        });
    }
    const statRows = summary.stats.untranslated;
    text += `\n---\n\n## 🔍 待核对的核心词缀明细清单 (${statRows.length} 条)\n\n`;
    if (!statRows.length) text += '> ✅ 按字段完整性检查，当前没有待核对词缀。\n';
    else {
        text += '| 序号 | 词缀分类 | 机器 ID | 英文词缀原文 | 状态 |\n| :---: | :--- | :--- | :--- | :--- |\n';
        statRows.forEach((row, index) => {
            text += `| ${index + 1} | ${code(row.category)} | ${code(row.id)} | ${code(row.en)} | 缺失或保留原文 |\n`;
        });
    }
    const snapshot = takeDictSnapshot(dictDir);
    const changes = oldSnapshot?.available?.length ? compareSnapshots(oldSnapshot, snapshot) : null;
    text += renderDiffSection(oldSnapshot, snapshot, changes);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'CHANGELOG.md'), text, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'CHANGELOG.diff.json'), JSON.stringify({ baselineAvailable: !!oldSnapshot?.available?.length, changes, summary, provenance: report.provenance || [] }, null, 2), 'utf8');
    console.log(`构建报告已生成：${outputDir}`);
    return { summary, changes, markdown: text };
}

module.exports = { generateDiffAndChangelog, takeDictSnapshot, diffMaps, extractMap, buildReportFromDictionaries, compareSnapshots, restoreBaseline };
