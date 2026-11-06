const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { summarizeItems, summarizeFilters } = require('../build_dict/scripts/utils/report_util.cjs');
const { buildFilters } = require('../build_dict/scripts/builders/build_filters.cjs');
const { buildItems } = require('../build_dict/scripts/builders/build_items.cjs');
const { extractBilingualMods } = require('../build_dict/scripts/fallback/fallback_stats.cjs');
const { takeDictSnapshot, compareSnapshots, generateDiffAndChangelog, extractMap, diffMaps, restoreBaseline } = require('../build_dict/scripts/diff.cjs');

async function run() {
    const root = path.resolve(__dirname, '../temp');
    fs.mkdirSync(root, { recursive: true });
    const sandbox = fs.mkdtempSync(path.join(root, 'dictionary-test-'));
    const dirs = Object.fromEntries(['en', 'tw', 'dict', 'report'].map(kind => [kind, path.join(sandbox, kind)]));
    for (const dir of Object.values(dirs)) fs.mkdirSync(dir);
    const write = (dir, kind, data) => fs.writeFileSync(path.join(dir, `${kind}.json`), JSON.stringify(data), 'utf8');
    const read = kind => JSON.parse(fs.readFileSync(path.join(dirs.dict, `${kind}.json`), 'utf8'));
    try {
        const counts = summarizeItems([{ id: 'x', entries: [
            { type: '[DNT] hidden' }, { type: 'Ring', name: 'Name', zh_tw: { type: '戒指', name: 'Name' } },
            { type: 'Sword', zh_tw: { type: '劍' } }, { type: 'Unknown' }
        ] }]);
        assert.equal(counts.finalRate, '33.33%');
        assert.equal(counts.partial, 1);
        assert.equal(counts.excluded, 1);
        assert.equal(summarizeItems([]).finalRate, '不适用');
        const aliases = { result: [{ id: 'explicit', entries: [
            { id: 'same', text: 'Area #', zh_tw: { text: '區域#' } },
            { id: 'same', text: 'Map #', zh_tw: { text: '地圖#' } }
        ] }] };
        const aliasMap = extractMap(aliases, 'stats');
        aliases.result[0].entries.reverse();
        assert.equal(diffMaps(aliasMap, extractMap(aliases, 'stats')).modified.length, 0);
        assert.equal(aliasMap.size, 4, '同 ID 不同原文不能相互覆盖');
        const separators = { result: [{ id: 'currency', entries: [{ id: 'sep', text: '' }, { id: 'sep', text: '' }] }] };
        const separatorMap = extractMap(separators, 'static');
        assert([...separatorMap.values()].some(value => value.occurrences === 2));
        separators.result[0].entries.pop();
        // 标识中使用重复 ID 原文细分；重复项减少也必须被记录。
        const separatorDiff = diffMaps(separatorMap, extractMap(separators, 'static'));
        assert(separatorDiff.modified.length || separatorDiff.added.length || separatorDiff.removed.length);
        const enFilters = { result: [{ id: 'trade', title: 'Trade', filters: [
            { id: 'status' }, { id: 'mode', text: 'Mode', option: { options: [{ id: '', text: '' }, { id: 'any', text: 'Any' }] } }
        ] }] };
        const twFilters = { result: [{ id: 'trade', title: '交易', filters: [
            { id: 'mode', text: '模式', option: { options: [{ id: 'any', text: '任何' }] } }
        ] }] };
        write(dirs.en, 'filters', enFilters); write(dirs.tw, 'filters', twFilters);
        const filters = buildFilters(dirs.en, dirs.tw, dirs.dict);
        assert.equal(filters.finalRate, '100.00%');
        assert.equal(filters.total, 5); assert.equal(filters.excluded, 2);
        assert.equal(filters.breakdown.filters.complete, 1);
        assert.equal(filters.breakdown.options.complete, 1);
        assert.equal(summarizeFilters(read('filters')).missing, 0);

        write(dirs.en, 'items', { result: [{ id: 'x', entries: [
            { type: '[DNT] hidden' }, { type: '' }, { type: 'Ring', name: 'Famous' },
            { type: 'Sword', name: 'Unlisted' }, { type: 'Unknown' }
        ] }] });
        const calls = [];
        const services = {
            fetchLatestAutocompleteJson: async () => [{ value: 'Famous', label: '名器' }, { value: 'Sword', label: '劍' }],
            httpGet: async url => {
                calls.push(url);
                if (url.endsWith('/Ring')) return { statusCode: 200, body: '<title>戒指 - PoE2DB</title>' };
                if (url.endsWith('/Unlisted')) return { statusCode: 200, body: '<title>無名 - 流亡黯道</title>' };
                return { statusCode: 404 };
            }
        };
        const items = await buildItems(dirs.en, dirs.tw, dirs.dict, services);
        assert.equal(items.complete, 2); assert.equal(items.partial, 0);
        assert.equal(items.excluded, 2); assert.equal(items.missing, 1);
        assert(calls.some(url => url.endsWith('/Ring')), '只翻译名称的物品必须继续补全基底');
        assert(calls.some(url => url.endsWith('/Unlisted')), '只翻译基底的物品必须继续补全名称');
        assert(!calls.some(url => url.includes('DNT') || url.endsWith('/Famous')), '不抓取占位项和已完整字段');
        assert.equal(items.untranslated[0].category, 'x');
        const cached = await buildItems(dirs.en, dirs.tw, dirs.dict, {
            fetchLatestAutocompleteJson: async () => null, httpGet: async () => ({ statusCode: 503 })
        });
        assert.equal(cached.complete, 2, '网络不可用时逐字段保留缓存翻译');
        assert.equal(cached.lookupStatus, 'cache-fallback');

        // 等长但换序的表格和多词缀卡片不能触发按位置配对。
        const pool = new Map();
        const table = rows => '<table><tr><th>header</th></tr>' + rows.map(t => `<tr><td>${t}</td></tr>`).join('') + '</table>';
        extractBilingualMods(table(['# to maximum Life', '# to maximum Mana']), table(['#最大魔力', '#最大生命']), pool);
        assert.equal(pool.size, 0);
        const card = mods => '<div class="col"><a href="Sword">Sword</a>' + mods.map(t => `<div class="explicitMod">${t}</div>`).join('') + '</div>';
        extractBilingualMods(card(['# to maximum Life', '# to maximum Mana']), card(['#最大魔力', '#最大生命']), pool);
        assert.equal(pool.size, 0);
        const tags = rows => rows.map(([id, text]) => `<div data-stat-id="${id}">${text}</div>`).join('');
        extractBilingualMods(tags([['life', '# to maximum Life'], ['mana', '# to maximum Mana']]),
            tags([['mana', '#最大魔力'], ['life', '#最大生命']]), pool);
        assert.equal(pool.get('# to maximum life'), '#最大生命');
        assert.equal(pool.get('# to maximum mana'), '#最大魔力');
        const duplicate = new Map();
        extractBilingualMods(tags([['life', '# to maximum Life']]), tags([['life', '#最大生命'], ['life', '#最大魔力']]), duplicate);
        assert.equal(duplicate.size, 0);

        write(dirs.dict, 'stats', { result: [{ id: 'explicit', label: 'Explicit', entries: [
            { id: 'a', text: '# to maximum Life', zh_tw: { text: '#最大生命', source: 'official' },
                option: { options: [{ id: 1, text: 'One', zh_tw: { text: '一' } }, { id: 2, text: 'Two' }] } }
        ] }] });
        write(dirs.dict, 'static', { result: [{ id: 'currency', entries: [
            { id: 'gold', text: 'Gold', zh_tw: { text: '金幣', source: 'official' } },
            { id: 'sep', text: '', zh_tw: { text: '分隔線', source: 'official' } }
        ] }] });
        const before = takeDictSnapshot(dirs.dict);
        const stats = read('stats'); stats.result[0].entries[0].option.options.reverse();
        write(dirs.dict, 'stats', stats);
        assert.equal(compareSnapshots(before, takeDictSnapshot(dirs.dict)).stats.modified.length, 0, '选项排序不能伪造变更');
        stats.result[0].entries[0].text = '# Life'; write(dirs.dict, 'stats', stats);
        const f = read('filters'); f.result[0].title = 'Trade Updated <script>|`';
        f.result[0].filters[1].option.options[1].zh_tw.text = '任意'; write(dirs.dict, 'filters', f);
        const i = read('items'); const named = i[0].entries.find(e => e.name === 'Famous');
        named.zh_tw.type = '指環'; write(dirs.dict, 'items', i);
        const sc = read('static'); sc.result[0].entries = sc.result[0].entries.filter(e => e.id !== 'gold'); write(dirs.dict, 'static', sc);
        const changes = compareSnapshots(before, takeDictSnapshot(dirs.dict));
        assert(changes.stats.modified.some(e => e.fields.includes('original')));
        assert(changes.filters.modified.some(e => e.fields.includes('translation')));
        assert(changes.filters.modified.some(e => e.fields.includes('original')));
        assert(changes.items.modified.some(e => e.fields.includes('translation')), 'text 未变时仍检测基底翻译变化');
        assert.equal(changes.static.removed.length, 1);
        const report = generateDiffAndChangelog({ sourceNote: '离线测试 <script>|`' }, before, {
            dictDir: dirs.dict, outputDir: dirs.report, now: new Date('2026-11-06T00:00:00Z')
        });
        assert(!report.markdown.includes('undefined'));
        assert(report.markdown.includes('2026/11/6 08:00:00'));
        assert(report.markdown.includes('&lt;script&gt;&#124;&#96;'));
        assert(report.markdown.includes('删除：'));
        assert(report.markdown.includes('filters.json'));
        assert(report.markdown.includes('📊 编译结果与覆盖率指标总览'));
        assert(report.markdown.includes('📁 产物输出与引用说明'));
        assert(report.markdown.includes('➜'));
        assert(!report.markdown.includes('{"type":'));
        assert(!report.markdown.includes('来源/元数据'));
        assert(!report.markdown.includes('| 语言 |'));
        assert(!report.markdown.includes('完整 -'), '排除的分隔符不能计入官方完整项');
        const saved = JSON.parse(fs.readFileSync(path.join(dirs.report, 'CHANGELOG.diff.json'), 'utf8'));
        const restored = restoreBaseline(saved, takeDictSnapshot(dirs.dict));
        assert(restored, '重新排版必须保留原有比较基准');
        assert.deepEqual(compareSnapshots(restored, takeDictSnapshot(dirs.dict)), changes);
        assert(saved.summary.stats.templateAudit, '诊断信息仍保存到 JSON');
        const first = generateDiffAndChangelog({}, null, { dictDir: dirs.dict, outputDir: dirs.report });
        assert.equal(first.changes, null);
        assert(first.markdown.includes('未提供可用历史快照'));
        fs.writeFileSync(path.join(dirs.dict, 'stats.json'), '{broken', 'utf8');
        assert.throws(() => takeDictSnapshot(dirs.dict), SyntaxError, '损坏快照不能伪装成首次构建');
        console.log('✅ 字典统计、部分补全、稳定标识对齐、四类结构化差异及报告回归通过');
    } finally {
        if (path.dirname(sandbox) !== root) throw new Error('测试目录越界');
        fs.rmSync(sandbox, { recursive: true, force: true });
    }
}

module.exports = run;
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
