const assert = require('assert');
const path = require('path');
const vm = require('vm');
const fs = require('fs');
const { buildSync, transformSync } = require('esbuild');

// 名称算法使用固定样例；真实词典另外按当前字段校验，不固定在线中文措辞。
const itemFixture = [{ id: 'fixtures', entries: [
    { type: 'Rattling Sceptre', zh_tw: { type: '雜響權杖' } },
    { type: 'Tasalian Focus', zh_tw: { type: '塔薩里奧法器' } },
    { type: 'Runeforged Tasalian Focus', zh_tw: { type: '符鍛塔薩里奧法器' } },
    { name: 'The Dark Defiler', zh_tw: { name: '黑暗玷汙者' } }
] }];
const compiled = buildSync({
    stdin: {
        contents: "export {parseFetchResults} from './src/parser/fetchParser'; export {parseItemsData,translateItemText,formatTranslatedItemText} from './src/parser/itemsParser';",
        resolveDir: path.resolve(__dirname, '..'), loader: 'ts'
    }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['*/dict/items.json']
});
function loadParser(items) {
    const sandbox = { module: { exports: {} }, console, GM_setValue: () => {}, require(id) {
        assert(id.endsWith('/dict/items.json'), `意外的外部依赖: ${id}`);
        return items;
    } };
    vm.runInNewContext(compiled.outputFiles[0].text, sandbox);
    return sandbox.module.exports;
}
const { parseFetchResults, parseItemsData, translateItemText, formatTranslatedItemText } = loadParser(itemFixture);

assert.equal(formatTranslatedItemText('Rattling Sceptre'), '雜響權杖 (Rattling Sceptre)');
assert.equal(formatTranslatedItemText('Exceptional Tasalian Focus'), '卓越塔薩里奧法器 (Exceptional Tasalian Focus)');
assert.equal(formatTranslatedItemText('Runeforged Tasalian Focus'), '符鍛塔薩里奧法器 (Runeforged Tasalian Focus)');
for (const unknown of [
    "Lord's Rattling Sceptre of the Virtuoso", 'Cerulean Rattling Sceptre of Skill',
    'Unknown Tasalian Focus', 'Tasalian Focus Unknown', 'Exceptional Unknown Focus',
    'Exceptional Exceptional Tasalian Focus', 'NotTasalian Focus', 'Tasalian FocusExtra'
]) assert.equal(formatTranslatedItemText(unknown), unknown, `未知组合必须完整保留英文: ${unknown}`);
assert.equal(formatTranslatedItemText('Miracle Spell', 'name'), 'Miracle Spell');
assert.equal(formatTranslatedItemText('Woe Chant', 'name'), 'Woe Chant');
assert.equal(formatTranslatedItemText('The Dark Defiler', 'name'), '黑暗玷汙者 (The Dark Defiler)');
// 单独装载相同解析器，用内存词典验证冲突及特殊字符，不修改真实字典。
const fixtureItems = [{ id: 'fixtures', entries: [
    { type: 'Ambiguous Focus', zh_tw: { type: '法器甲' } },
    { type: 'Ambiguous Focus', zh_tw: { type: '法器乙' } },
    { type: 'Fixture Focus (Tier 1)', zh_tw: { type: '測試法器（階級1）' } }
] }];
const fixtureSource = fs.readFileSync(path.resolve(__dirname, '../src/parser/itemsParser.ts'), 'utf8')
    .replace("import rawItems from '../dict/items.json';", `const rawItems = ${JSON.stringify(fixtureItems)};`);
const fixtureSandbox = { module: { exports: {} } };
vm.runInNewContext(transformSync(fixtureSource, { loader: 'ts', format: 'cjs' }).code, fixtureSandbox);
const fixtureFormat = fixtureSandbox.module.exports.formatTranslatedItemText;
assert.equal(fixtureFormat('Ambiguous Focus'), 'Ambiguous Focus', '冲突译文不能取最后一个');
assert.equal(fixtureFormat('Exceptional Ambiguous Focus'), 'Exceptional Ambiguous Focus');
assert.equal(fixtureFormat('Fixture Focus (Tier 1)'), '測試法器（階級1） (Fixture Focus (Tier 1))');
assert.equal(translateItemText('Rattling Sceptre', 'name'), 'Rattling Sceptre', '随机名称不能因碰巧等于基底名而按基底翻译');

const response = { result: [
    { item: { name: '', baseType: 'Tasalian Focus', typeLine: 'Exceptional Tasalian Focus' } },
    { item: { name: '', baseType: 'Exceptional Tasalian Focus', typeLine: 'Exceptional Tasalian Focus' } },
    { item: { name: '', baseType: 'Rattling Sceptre', typeLine: "Lord's Rattling Sceptre of the Virtuoso" } },
    { item: { name: 'Miracle Spell', baseType: 'Rattling Sceptre', typeLine: 'Rattling Sceptre' } },
    { item: { name: 'The Dark Defiler', baseType: 'Rattling Sceptre', typeLine: 'Rattling Sceptre',
        grantedSkills: [{ name: 'Grants Skill: Level 18 Skeletal Warrior Minion' }] } }
] };
parseFetchResults(response, {}, {});
assert.equal(response.result[0].item.typeLine, '卓越塔薩里奧法器 (Exceptional Tasalian Focus)');
assert.equal(response.result[0].item.name, '');
assert.equal(response.result[1].item.baseType, '卓越塔薩里奧法器 (Exceptional Tasalian Focus)');
assert.equal(response.result[2].item.typeLine, "Lord's Rattling Sceptre of the Virtuoso");
assert.equal(response.result[3].item.name, 'Miracle Spell');
assert.equal(response.result[3].item.typeLine, '雜響權杖 (Rattling Sceptre)');
assert.equal(response.result[4].item.name, '黑暗玷汙者 (The Dark Defiler)');
assert.equal(response.result[4].item.grantedSkills[0].name, 'Grants Skill: Level 18 Skeletal Warrior Minion', '本次不猜测技能字段');
const once = JSON.stringify(response);
parseFetchResults(response, {}, {});
assert.equal(JSON.stringify(response), once, '重复处理不能重复追加翻译或修改括号内英文');

const options = { result: [{ id: 'weapons', entries: [
    { type: 'Rattling Sceptre' }, { type: 'Exceptional Tasalian Focus' },
    { type: 'Rattling Sceptre', name: 'The Dark Defiler' }
] }] };
parseItemsData(options, {});
assert.equal(options.result[0].entries[0].text, '雜響權杖 (Rattling Sceptre)');
assert.equal(options.result[0].entries[1].text, '卓越塔薩里奧法器 (Exceptional Tasalian Focus)');
assert.equal(options.result[0].entries[2].text, '黑暗玷汙者 雜響權杖 (The Dark Defiler Rattling Sceptre)');
const firstOptions = JSON.stringify(options);
parseItemsData(options, {});
assert.equal(JSON.stringify(options), firstOptions);
const realItems = require('../src/dict/items.json');
const realParser = loadParser(realItems);
let checked = 0;
for (const field of ['type', 'name']) {
    const translations = new Map();
    for (const group of realItems) for (const entry of group.entries || []) {
        const original = entry[field], translated = entry.zh_tw?.[field];
        if (!original || !translated?.trim() || original === translated) continue;
        if (!translations.has(original)) translations.set(original, new Set());
        translations.get(original).add(translated);
    }
    for (const [original, values] of translations) {
        const expected = values.size === 1 ? `${[...values][0]} (${original})` : original;
        assert.equal(realParser.formatTranslatedItemText(original, field), expected, `真实词典名称/冲突处理: ${original}`);
        checked++;
    }
}
assert(checked > 0, '真实物品词典不能没有可检查的译文');
console.log('✅ 物品名称回归通过：精确双语、卓越前缀、空名称、未知组合、随机名称与重复处理');
