const { cleanAndToSign } = require('../utils/clean_util.cjs');
const { normalizeStatText, compileStatTemplate } = require('../../../scripts/stat-template-tools.cjs');
const plain = value => cleanAndToSign(value).replace(/&nbsp;/g, ' ').replace(/&#0*39;|&apos;/g, "'");
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 保留 mod-value 边界（含嵌套的范围标签），不能将文本里的所有数字转为变量。
function markedValues(html) {
    const values = [];
    let output = '', previous = 0, start = -1, content = -1, depth = 0;
    for (const match of html.matchAll(/<\/?span\b[^>]*>/gi)) {
        const closing = /^<\//.test(match[0]);
        if (start === -1) {
            if (!closing && /class=["']mod-value["']/i.test(match[0])) {
                start = match.index; content = match.index + match[0].length; depth = 1;
            }
        } else {
            depth += closing ? -1 : 1;
            if (depth === 0) {
                output += html.slice(previous, start) + `@@VALUE${values.length}@@`;
                values.push(plain(html.slice(content, match.index)));
                previous = match.index + match[0].length; start = -1;
            }
        }
    }
    if (start !== -1) return null;
    return { text: normalizeStatText(plain(output + html.slice(previous))), values };
}

function cards(html) {
    const result = new Map(), conflicts = new Set();
    for (const card of html.split(/<div class=["']col["']>/i).slice(1)) {
        const slug = card.match(/href=["'](?:\/(?:us|tw)\/)?([A-Za-z0-9_-]+)["']/)?.[1];
        if (!slug) continue;
        for (const match of card.matchAll(/<div class=["'](?:poe2 )?(implicitMod|bondedMod|explicitMod|mutatedMod)["'][^>]*>([\s\S]*?)<\/div>/g)) {
            let body = match[2], slot = '';
            const prefix = body.match(/^\s*(<a\b[^>]*>[\s\S]*?<\/a>|[^<:]+)\s*:\s*/i);
            if (prefix) {
                const linked = prefix[1].match(/<a\b[^>]*href=["']([A-Za-z0-9_-]+)["'][^>]*>/);
                if (!linked) continue; // 无稳定部位标识，不猜测 Armour/護甲等文本对应关系。
                slot = linked[1]; body = body.slice(prefix[0].length);
            }
            const keywords = [...new Set([...body.matchAll(/data-keyword=["']([^"']+)["']/g)].map(m => m[1]))].sort();
            if (!slot && !keywords.length) continue;
            const value = markedValues(body);
            if (!value) continue;
            const key = JSON.stringify([slug, match[1], slot, keywords]);
            if (conflicts.has(key)) continue;
            if (result.has(key) && JSON.stringify(result.get(key)) !== JSON.stringify(value)) {
                result.delete(key); conflicts.add(key);
            } else result.set(key, value);
        }
    }
    return result;
}

function extractEvidence(usHtml, twHtml, source) {
    const us = cards(usHtml), tw = cards(twHtml), pairs = [];
    for (const [key, en] of us) if (tw.has(key)) pairs.push({ key, en, tw: tw.get(key), source });
    return pairs;
}

const valueKey = value => value.replace(/[\s()+]/g, '').replace(/[—–至]/g, '-');
function projectTemplate(english, pair) {
    const template = normalizeStatText(english);
    let source = pair.en.text, target = pair.tw.text;
    const tokens = [];
    for (let i = 0; i < pair.en.values.length; i++) {
        source = source.replace(`@@VALUE${i}@@`, () => `@@CAPTURE${i}@@`);
    }
    // 候选的每一个来源数值片段必须对应变量或完整的固定常量。
    // 先按英文模板的文字边界匹配来源原文，数字常量仍保持精确。
    const actual = source.replace(/@@CAPTURE(\d+)@@/g, (_, index) => pair.en.values[Number(index)]);
    const pieces = template.split('#');
    const pattern = new RegExp(`^${pieces.map(escape).join('(.+?)')}$`, 'i');
    const matched = pattern.exec(actual);
    if (!matched) return null;
    const consumed = new Set();
    let offset = pieces[0].length;
    for (let i = 1; i < matched.length; i++) {
        const value = valueKey(matched[i]);
        const enIndexes = pair.en.values.map((text, index) => valueKey(text) === value ? index : -1).filter(index => index >= 0);
        const twIndexes = pair.tw.values.map((text, index) => valueKey(text) === value ? index : -1).filter(index => index >= 0);
        if (enIndexes.length !== 1 || twIndexes.length !== 1 || consumed.has(twIndexes[0])) return null;
        // 变量捕获必须恰好覆盖一个标注片段，不能来自固定文本或片段的一部分。
        const marker = `@@CAPTURE${enIndexes[0]}@@`;
        const location = source.indexOf(marker);
        const prefix = source.slice(0, location).replace(/@@CAPTURE(\d+)@@/g, (_, index) => pair.en.values[Number(index)]);
        if (location < 0 || pair.en.values[enIndexes[0]] !== matched[i] || prefix.length !== offset) return null;
        offset += matched[i].length + pieces[i].length;
        consumed.add(twIndexes[0]);
        tokens.push({ marker: `@@VALUE${twIndexes[0]}@@`, variable: `{${i - 1}}` });
    }
    for (const token of tokens) target = target.replace(token.marker, token.variable);
    target = target.replace(/@@VALUE(\d+)@@/g, (_, index) => pair.tw.values[Number(index)]);
    const validation = compileStatTemplate(english, target);
    if (!validation.template) return null;
    return { text: target.replace(/\{\d+\}/g, '#'), template: target, source: 'poe2db_verified_html', evidence: { url: pair.source, key: pair.key } };
}

function resolveEvidence(english, pairs) {
    const found = pairs.map(pair => projectTemplate(english, pair)).filter(Boolean);
    const translations = new Set(found.map(value => value.template));
    return translations.size === 1 ? found[0] : null;
}

async function resolveNames(entries, httpGet) {
    const result = new Map();
    for (const entry of entries) {
        const slug = encodeURIComponent(entry.text.replace(/\s+/g, '_'));
        const urls = [`https://poe2db.tw/us/${slug}`, `https://poe2db.tw/tw/${slug}`];
        const pages = await Promise.all(urls.map(url => httpGet(url)));
        if (pages.some(page => page.statusCode !== 200 || typeof page.body !== 'string')) continue;
        const names = pages.map(page => plain(page.body.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1] || ''));
        const ids = pages.map(page => plain(page.body.match(/<tr><td>ID<\/td><td>([\s\S]*?)<\/td><\/tr>/i)?.[1] || ''));
        const hashes = pages.map(page => page.body.match(/<tr><td>PassiveSkillsHash<\/td><td>(\d+)<\/td><\/tr>/i)?.[1]);
        if (names[0] !== entry.text || !/[\u3400-\u9fff]/.test(names[1]) || !ids[0] || ids[0] !== ids[1] || !hashes[0] || hashes[0] !== hashes[1]) continue;
        result.set(entry.id, { text: names[1], source: 'poe2db_verified_name', evidence: { urls, passiveId: ids[0], hash: hashes[0] } });
    }
    return result;
}

module.exports = { markedValues, extractEvidence, projectTemplate, resolveEvidence, resolveNames };
