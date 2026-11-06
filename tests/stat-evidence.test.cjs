const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { extractEvidence, resolveEvidence, resolveNames } = require('../build_dict/scripts/fallback/stat_evidence.cjs');
const { compileStatTemplate, renderStatTemplate } = require('../scripts/stat-template-tools.cjs');

async function run() {
    const card = body => `<div class="col"><a href="Stable_Rune">Rune</a><div class="bondedMod">${body}</div></div>`;
    const slot = '<a class="ItemClasses" href="Gloves">Gloves</a>: ';
    const value = text => `<span class='mod-value'>${text}</span>`;
    const keyword = (key, text) => `<a data-keyword="${key}" href="${key}" data-hover="https://cdn.poe2db.tw/value">${text}</a>`;
    const us = card(slot + value('1') + '% increased Damage per 15 ' + keyword('Strength', 'Strength'));
    const tw = card(slot + '每15點' + keyword('Strength', '力量') + '增加' + value('1') + '%傷害');
    const pairs = extractEvidence(us, tw, 'https://poe2db.tw/us/Stable_Rune');
    const result = resolveEvidence('Bonded: #% increased Damage per 15 Strength', pairs);
    assert(result);
    assert.equal(result.template, '每15點力量增加{0}%傷害');
    assert.equal(renderStatTemplate(compileStatTemplate('Bonded: #% increased Damage per 15 Strength', result.template).template,
        'Bonded: 20% increased Damage per 15 Strength'), '每15點力量增加20%傷害');
    assert.equal(resolveEvidence('Bonded: #% increased Damage per 10 Strength', pairs), null);
    assert.equal(resolveEvidence('Bonded: 1% increased Damage per # Strength', pairs), null, '不能把来源中的固定数值当成变量');
    const wrongConstant = extractEvidence(us, tw.replace('每15', '每14'), 'url');
    assert.equal(resolveEvidence('Bonded: #% increased Damage per 15 Strength', wrongConstant), null);
    const noSlot = extractEvidence(card(value('10') + '% increased Damage per ' + keyword('Curse', 'Curse') + ' on you'),
        card('你身上每有一個' + keyword('Curse', '詛咒') + '，增加' + value('10') + '%傷害'), 'url');
    assert(resolveEvidence('#% increased Damage per Curse on you', noSlot), 'https: 不能被识别成部位分隔符');
    const u2 = card(slot + value('10') + ' ' + keyword('Damage', 'Damage') + ' and ' + value('20') + ' ' + keyword('Life', 'Life'));
    const t2 = card(slot + value('20') + keyword('Life', '生命') + '與' + value('10') + keyword('Damage', '傷害'));
    const mapped = resolveEvidence('# Damage and # Life', extractEvidence(u2, t2, 'url'));
    assert.equal(mapped.template, '{1}生命與{0}傷害');
    assert.equal(renderStatTemplate(compileStatTemplate('# Damage and # Life', mapped.template).template,
        '30 Damage and 40 Life'), '40生命與30傷害');
    assert.equal(resolveEvidence('# Damage and # Life', extractEvidence(u2.replace('20', '10'), t2.replace('20', '10'), 'url')), null, '相同数值的变量不能靠顺序猜测');
    assert.equal(extractEvidence(card('Armour: ' + value('1') + ' Damage'), card('護甲: ' + value('1') + '傷害'), 'url').length, 0);
    const namePage = (title, id, hash) => `<meta property="og:title" content="${title}"><tr><td>ID</td><td>${id}</td></tr><tr><td>PassiveSkillsHash</td><td>${hash}</td></tr>`;
    const entries = [{ id: 'explicit.test', text: 'Example' }];
    const mockGet = async url => ({ statusCode: 200, body: namePage(url.includes('/us/') ? 'Example' : '範例', 'passive_code', '123') });
    const names = await resolveNames(entries, mockGet);
    assert.equal(names.get('explicit.test').text, '範例');
    const conflicts = await resolveNames(entries, async url => ({ statusCode: 200, body: namePage(url.includes('/us/') ? 'Example' : '範例', 'passive_code', url.includes('/us/') ? '123' : '456') }));
    assert.equal(conflicts.size, 0);
    const root = path.resolve(__dirname, '../temp');
    fs.mkdirSync(root, { recursive: true });
    const dir = fs.mkdtempSync(path.join(root, 'verified-stats-test-'));
    try {
        const enDir = path.join(dir, 'en'), twDir = path.join(dir, 'tw'), outDir = path.join(dir, 'dict');
        for (const subdir of [enDir, twDir, outDir]) fs.mkdirSync(subdir);
        const en = { result: [{ id: 'explicit', entries: [
            { id: 'explicit.keep', text: '# damage per 15 Strength' },
            { id: 'explicit.unverified', text: '# Life' }
        ] }] };
        fs.writeFileSync(path.join(enDir, 'stats.json'), JSON.stringify(en));
        fs.writeFileSync(path.join(twDir, 'stats.json'), JSON.stringify({ result: [] }));
        const old = JSON.parse(JSON.stringify(en));
        old.result[0].entries[0].zh_tw = { text: '每15力量#傷害', template: '每15力量{0}傷害', source: 'poe2db_verified_html', evidence: { key: 'stable', url: 'https://poe2db.tw/us/example' } };
        old.result[0].entries[1].zh_tw = { text: '#生命', source: 'poe2db_dynamic' };
        fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(old));
        await require('../build_dict/scripts/builders/build_stats.cjs').buildStats(enDir, twDir, outDir, {
            searchPoe2dbStats: async () => ({ statZhMap: new Map(), foundCount: 0 }),
            resolveNames: async () => new Map(), httpGet: async () => ({ statusCode: 503 })
        });
        const rebuilt = JSON.parse(fs.readFileSync(path.join(outDir, 'stats.json'), 'utf8')).result[0].entries;
        assert.equal(rebuilt.find(e => e.id === 'explicit.keep').zh_tw.template, '每15力量{0}傷害');
        assert.equal(rebuilt.find(e => e.id === 'explicit.keep').zh_tw.source, 'poe2db_verified_cache');
        assert.equal(rebuilt.find(e => e.id === 'explicit.unverified').zh_tw, undefined, '不能盲目继承未经验证的旧译文');
    } finally {
        if (path.dirname(dir) !== root) throw new Error('测试目录越界');
        fs.rmSync(dir, { recursive: true, force: true });
    }
    console.log('✅ 动态词缀来源验证通过：变量追踪、常量保留、编号重排、歧义拒绝与稳定节点名称');
}
module.exports = run;
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
