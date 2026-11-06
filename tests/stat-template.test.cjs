const assert = require('assert');
const path = require('path');
const vm = require('vm');
const fs = require('fs');
const { createRequire } = require('module');
const { buildSync } = require('esbuild');
const { compileStatTemplate, renderStatTemplate, auditStatTemplates } = require('../scripts/stat-template-tools.cjs');
const { cleanAndToSign } = require('../build_dict/scripts/utils/clean_util.cjs');

function render(en, tw, input) {
    const result = compileStatTemplate(en, tw);
    assert(result.template, result.reason);
    return renderStatTemplate(result.template, input);
}

assert.equal(render('+1 to Maximum Spirit per # Maximum Life', '每#最大生命，+1最大精魂',
    '+1 to Maximum Spirit per 100 Maximum Life'), '每100最大生命，+1最大精魂');
assert.equal(render('#% increased Damage per 15 Strength', '每15點力量增加#%傷害',
    '20% increased Damage per 15 Strength'), '每15點力量增加20%傷害');
assert.equal(render('Adds # to # Physical Damage', '附加#至#物理傷害',
    'Adds 10 to 20 Physical Damage'), '附加10至20物理傷害');
assert.equal(render('# to # Cold Thorns damage', '#至#點冰冷荊棘傷害',
    '10 to 20 Cold Thorns damage'), '10至20點冰冷荊棘傷害');
assert.equal(render('{0}% increased Damage per {1} Strength', '每{1}力量增加{0}%傷害',
    '20% increased Damage per 15 Strength'), '每15力量增加20%傷害');
assert.equal(render('# to maximum Life', '#最大生命', '-12.5 to maximum Life'), '-12.5最大生命');
assert.equal(render('Adds # to # Physical Damage', '附加#至#物理傷害',
    'Adds 1.5 to 2.5 Physical Damage'), '附加1.5至2.5物理傷害');
assert.equal(render('#% increased Attack Speed per 25 Dexterity', '每25敏捷增加#%攻速',
    '8% increased Attack Speed per 20 Dexterity'), null);
assert.equal(render('# to maximum Life', '#最大生命', 'prefix +25 to maximum Life'), null);
assert.equal(render('Damage (Local): #', '傷害 (Local)：#', 'Damage (Local): 5'), '傷害 (Local)：5');

for (const [en, tw] of [
    ['#% increased Damage per 15 Strength', '每#點力量增加#%傷害'],
    ['Adds # to # Physical Damage', '附加#物理傷害'],
    ['#% chance per 25 Strength', '每25力量有5%機率'],
    ['Area contains an additional Strongbox', '地圖內含有額外的#個保險箱'],
    ['# damage and # Life', '#傷害和#生命'],
    ['{0} damage and {1} Life', '{0}傷害和{0}生命'],
    ['#% increased Damage per 15 Strength', '每10力量增加#%傷害']
]) assert(!compileStatTemplate(en, tw).template, `必须拒绝不安全模板: ${en}`);

assert.equal(cleanAndToSign('Gain 10% of Damage per 2% Chance to Block', true),
    'Gain 10% of Damage per 2% Chance to Block');
assert.notEqual(cleanAndToSign('Gain #% of Damage per 2% Chance to Block', true),
    cleanAndToSign('Gain #% of Damage per 3% Chance to Block', true));
assert.equal(cleanAndToSign('Adds 10–20 Physical Damage', true), 'Adds 10–20 Physical Damage');
assert.equal(cleanAndToSign('-15% Resistance', true), '-15% Resistance');

// 同一签名出现冲突时，无论数据到达顺序如何都不能选择最后一个翻译。
const fallbackFile = path.resolve(__dirname, '../build_dict/scripts/fallback/fallback_stats.cjs');
const poolSandbox = { module: { exports: {} }, require: createRequire(fallbackFile), console };
vm.runInNewContext(fs.readFileSync(fallbackFile, 'utf8') + '\nmodule.exports.savePair = saveBilingualPair;', poolSandbox);
for (const translations of [['#最大生命', '#最大魔力'], ['#最大魔力', '#最大生命']]) {
    const pool = new Map();
    for (const tw of translations) poolSandbox.module.exports.savePair('# to maximum Life', tw, pool);
    assert.equal(pool.size, 0, '冲突翻译必须被隔离，不能受完成顺序影响');
}

// 执行真正的 TS 解析器。编译只在内存中进行，不产生测试产物。
const result = buildSync({
    stdin: {
        contents: "export { parseFetchResults } from './src/parser/fetchParser'; export { parseStatsData } from './src/parser/statsParser'; export { translateStatText } from './src/core/statTranslator';",
        resolveDir: path.resolve(__dirname, '..'), loader: 'ts'
    }, bundle: true, platform: 'node', format: 'cjs', write: false
});
const sandbox = { module: { exports: {} }, console, GM_setValue: () => {} };
vm.runInNewContext(result.outputFiles[0].text, sandbox);
const { parseFetchResults, parseStatsData, translateStatText } = sandbox.module.exports;
function parseMod(category, id, text, options = {}) {
    const mod = options.object ? { description: text, hash: id, extra: 123 } : text;
    const item = { [category + 'Mods']: [mod] };
    if (!options.noHashes) item.extended = { hashes: { [category]: id ? [[id, [0]]] : [] } };
    const response = { result: [{ item, listing: { whisper_token: 'token', whisper: 'original whisper' } }] };
    const whispers = {};
    parseFetchResults(response, { stats: [{ id: category, entries: [{ id, twText: '旧缓存错误数值' }] }] }, whispers);
    assert.equal(whispers.token, 'original whisper');
    return response.result[0].item[category + 'Mods'][0];
}
assert.equal(parseMod('explicit', 'explicit.stat_1345486764', '+1 to Maximum Spirit per 100 Maximum Life'),
    '每100最大生命，+1最大精魂 (+1 to Maximum Spirit per 100 Maximum Life)');
assert.equal(parseMod('explicit', 'stat_3299347043', '+25 to maximum Life'), '+25最大生命 (+25 to maximum Life)');
assert.equal(parseMod('explicit', null, '+25 to maximum Life', { noHashes: true }), '+25最大生命 (+25 to maximum Life)');
const object = parseMod('explicit', 'explicit.stat_3299347043', '+25 to maximum Life', { object: true });
assert.equal(object.description, '+25最大生命 (+25 to maximum Life)');
assert.equal(object.extra, 123);
assert.equal(object.hash, 'explicit.stat_3299347043');
assert.equal(parseMod('explicit', 'unknown.stat', '+25 to maximum Life'), '+25最大生命 (+25 to maximum Life)');
assert.equal(parseMod('explicit', 'explicit.stat_2241560081', '8% increased Attack Speed per 20 Dexterity'),
    `${translateStatText('8% increased Attack Speed per 20 Dexterity', 'explicit')} (8% increased Attack Speed per 20 Dexterity)`);
assert(translateStatText('8% increased Attack Speed per 20 Dexterity', 'explicit').includes('20'));
assert.equal(translateStatText('+25 to maximum Life extra text', 'explicit'), null);
assert.equal(translateStatText('1% damage unknown', 'unknown'), null);
// 截图回归：接口 hash 缺失、未知或归类不同，已有译文仍应显示为“繁中（英文）”。
for (const [category, text, expected] of [
    ['explicit', '+3 to Level of all Minion Skills', '全部召喚物技能等級+3'],
    ['explicit', '13% increased Spell Damage', '增加13%法術傷害'],
    ['explicit', '+10 to Dexterity', '+10點敏捷'],
    ['implicit', '-1 Prefix Modifier allowed', '允許前綴-1'],
    ['implicit', '-1 Suffix Modifier allowed', '允許後綴-1'],
    ['granted', 'Grants Skill: Level 19 Cast on Elemental Ailment', '賦予技能: 等級 19 元素異常狀態時施放']
]) {
    assert.equal(parseMod(category, 'server.variant_unknown', text), `${expected} (${text})`);
    assert.equal(parseMod(category, null, text, { noHashes: true }), `${expected} (${text})`);
}
assert.equal(translateStatText('+3 to Level of all Minion Skills'), '全部召喚物技能等級+3');
assert.equal(parseMod('rune', 'rune.stat_1524834794', 'Bonded: 20% increased Damage per 15 Strength'),
    '每15點力量增加20%傷害 (Bonded: 20% increased Damage per 15 Strength)');
assert.equal(parseMod('rune', 'rune.stat_995044379', '30 to maximum Mana per 3 Item Armour on Equipped Helmet'),
    '裝備的頭盔每有3物品護甲即30最大魔力 (30 to maximum Mana per 3 Item Armour on Equipped Helmet)');
assert.equal(parseMod('rune', 'rune.stat_2291075173', 'Bonded: Every five Rage also grants you 12% increased Movement Speed'),
    '每5盛怒同時使你增加12%移動速度 (Bonded: Every five Rage also grants you 12% increased Movement Speed)');
const sprint = 'When you stop Sprinting, gain Guard equal to 5% of maximum Life per second spent Sprinting, up to a maximum of 20%, for 4 seconds';
assert.equal(parseMod('rune', 'rune.stat_293832783', sprint),
    `當你停止衝刺時每已衝刺一秒，即獲得等同於5%最大生命的保護，最高20%，持續4秒 (${sprint})`);
assert.equal(translateStatText(sprint.replace('maximum of 20%', 'maximum of 19%'), 'rune', ['rune.stat_293832783']), null);
for (const [name, expected] of [['Conduit', '能量連結'], ['Heartstopper', '心靈永止'], ['Oasis', '幻景綠洲'], ['Bulwark', '守護']]) {
    assert.equal(translateStatText(name, 'explicit'), expected);
}
// 同一机器 ID 的 Area/Map 原文变体均应保留，而非后者覆盖前者。
for (const noun of ['Area', 'Map']) {
    const text = `Revived Monsters from Ritual Altars in ${noun} have 12% increased chance to be Magic`;
    assert(translateStatText(text, 'explicit', ['explicit.stat_1031644647']), `丢失同 ID 的 ${noun} 变体`);
}

const stats = require('../src/dict/stats.json');
const audit = auditStatTemplates(stats);
assert.equal(audit.total, audit.usable + audit.unsafe + audit.missing);
for (const category of stats.result) {
    for (const entry of category.entries) {
        if (!entry.zh_tw?.text || compileStatTemplate(entry.text, entry.zh_tw.template || entry.zh_tw.text).template) continue;
        let index = 0;
        const input = entry.text.replace(/#/g, () => String(17 + index++ * 12));
        assert.equal(parseMod(category.id, entry.id, input), input, `不安全模板必须保留英文: ${entry.id}`);
    }
}
const metadata = JSON.parse(JSON.stringify(require('../build_dict/raw/raw_en/stats.json')));
parseStatsData(metadata, {});
for (const issue of audit.issues) {
    const entry = metadata.result.flatMap(c => c.entries).find(e => e.id === issue.id);
    if (entry) assert.equal(entry.twText, undefined, `筛选器不能继续暴露不安全模板: ${issue.id}`);
}
const notableText = '8% increased Attack Speed per 20 Dexterity';
const notable = { result: [{ item: { notableProperties: [{ values: [[notableText, 0]] }] } }] };
parseFetchResults(notable, {}, {});
assert.equal(notable.result[0].item.notableProperties[0].values[0][0],
    `${translateStatText(notableText)} (${notableText})`);
console.log(`✅ 模板回归验证通过：常量、范围、编号重排、负数、小数、hash、缓存、珠宝说明及 ${audit.unsafe} 条不安全模板回退`);
