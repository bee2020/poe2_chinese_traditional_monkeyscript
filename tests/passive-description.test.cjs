const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { transformSync, buildSync } = require('esbuild');
const { buildPassives, parseTreeIndex } = require('../build_dict/scripts/builders/build_passives.cjs');

async function run() {
    const fixture = { id: '64659', enName: 'Lasting Boons', twName: '持續恩惠',
        en: ['20% reduced Slowing Potency of Debuffs on You', 'Buffs on you expire 10% slower'],
        tw: ['減少20%你身上的減益效果緩速程度', '你身上的增益效果減緩10%失效'] };
    const source = fs.readFileSync(path.resolve(__dirname, '../src/core/passiveTranslator.ts'), 'utf8')
        .replace("import rawPassives from '../dict/passives.json';", `const rawPassives = ${JSON.stringify({ entries: [fixture] })};`);
    const sandbox = { module: { exports: {} } };
    vm.runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, sandbox);
    const translate = sandbox.module.exports.translatePassiveDescription;
    const values = fixture.en.map(line => [line, 0]);
    const translated = translate(fixture.enName, values);
    assert.equal(translated.name, '持續恩惠 (Lasting Boons)');
    assert.equal(translated.values[0][0], `${fixture.tw.join('\n')}\n(${fixture.en.join('\n')})`);
    assert.equal(translate('Unknown Passive', values), null);
    assert.equal(translate(fixture.enName, [[fixture.en[0].replace('20%', '21%'), 0], [fixture.en[1], 0]]), null);
    assert.equal(translate(fixture.enName, [[fixture.en[0], 0]]), null, '缺少一行时不能套用完整说明');
    assert.equal(translate(fixture.enName, values.slice().reverse()), null, '原文顺序变化须重新核对');
    assert.equal(translate(fixture.enName, [[fixture.en[0], 0], [fixture.en[1], 1]]), null, '不能丢弃不同的样式元数据');
    assert.equal(translate(translated.name, translated.values), null, '双语内容不能重复翻译');

    const root = path.resolve(__dirname, '../temp');
    fs.mkdirSync(root, { recursive: true });
    const dir = fs.mkdtempSync(path.join(root, 'passive-test-'));
    const url = lang => `https://cdn.poe2db.tw/cache2/${lang}/Poe_Data_PassiveSkills_hover/abc123`;
    const tree = lang => `<circle class="notable " id="n64659" data-hover="${url(lang)}"/>`;
    const hover = (name, lines) => `<div class="itemName typeLine"><span>${name}</span></div>` + lines.map(line => `<div class="implicitMod">${line}</div>`).join('');
    try {
        const stats = { result: [{ id: 'enchant', entries: [{ id: 'enchant.stat_2954116742|64659', text: 'Allocates Lasting Boons' }] }] };
        fs.writeFileSync(path.join(dir, 'stats.json'), JSON.stringify(stats));
        let downloads = 0;
        const services = {
            mapConcurrent: async (items, limit, fn) => Promise.all(items.map(fn)),
            httpGet: async address => {
                const lang = address.includes('/us/') ? 'us' : 'tw';
                if (address.includes('/cache2/')) { downloads++; return { statusCode: 200, body: hover(lang === 'us' ? fixture.enName : fixture.twName, lang === 'us' ? fixture.en : fixture.tw) }; }
                return { statusCode: 200, body: tree(lang) };
            }
        };
        const first = await buildPassives(dir, services);
        assert.equal(first.available, 1); assert.equal(downloads, 2);
        const second = await buildPassives(dir, services);
        assert.equal(second.cached, 1); assert.equal(downloads, 2, '内容地址未变化时不重复下载');
        const noIndex = await buildPassives(dir, { ...services, httpGet: async () => ({ statusCode: 503 }) });
        assert.equal(noIndex.available, 1, '索引失败不能清空已有译文');
        const duplicate = tree('us') + '<circle class="notable" id="n64659" data-hover="https://cdn.poe2db.tw/cache2/us/Poe_Data_PassiveSkills_hover/def456"/>';
        assert.equal(parseTreeIndex(duplicate, 'us').size, 0, '同 ID 冲突不能取最后一个地址');
        assert.equal(parseTreeIndex('<circle class="notable" id="n64659" data-hover="https://example.com/evil"/>', 'us').size, 0);
    } finally {
        if (path.dirname(dir) !== root) throw new Error('测试目录越界');
        fs.rmSync(dir, { recursive: true, force: true });
    }

    // 用已打包进源码的真实数据验证截图中的天赋，禁止把名称或常量相近的说明硬套。
    const real = require('../src/dict/passives.json').entries;
    const compiled = buildSync({ stdin: { contents: "export {parseFetchResults} from './src/parser/fetchParser';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
    const runtime = { module: { exports: {} }, console };
    vm.runInNewContext(compiled.outputFiles[0].text, runtime);
    for (const name of ['Lasting Boons', 'Unsight', 'Unforgiving', 'Far Sighted', 'Molten Claw', 'Efficient Alchemy']) {
        const entry = real.find(row => row.enName === name);
        assert(entry, `截图天赋必须有经过核对的双语数据：${name}`);
        const response = { result: [{ item: { notableProperties: [{ name, values: entry.en.map(line => [line, 0]) }] } }] };
        runtime.module.exports.parseFetchResults(response, {}, {});
        const result = response.result[0].item.notableProperties[0];
        assert.equal(result.values[0][0], `${entry.tw.join('\n')}\n(${entry.en.join('\n')})`);
        assert.equal(result.name, `${entry.twName} (${name})`);
    }
    console.log('✅ 天赋说明回归通过：稳定节点、整段精确匹配、常量拒绝、缓存和截图天赋');
}
module.exports = run;
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
