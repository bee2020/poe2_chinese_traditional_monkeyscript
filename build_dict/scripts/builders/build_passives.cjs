const fs = require('fs');
const path = require('path');
const { httpGet, mapConcurrent } = require('../fallback/poe2db_client.cjs');

function plain(text) {
    return text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'")
        .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function parseTreeIndex(html, language) {
    const map = new Map(), conflicts = new Set();
    for (const match of html.matchAll(/<circle\b[^>]*>/gi)) {
        const tag = match[0];
        if (!/class=["'][^"']*\bnotable\b/i.test(tag)) continue;
        const id = tag.match(/\bid=["']n(\d+)["']/)?.[1];
        const url = tag.match(/\bdata-hover=["']([^"']+)["']/)?.[1];
        if (!id || !url || conflicts.has(id)) continue;
        if (!new RegExp(`^https://cdn\\.poe2db\\.tw/cache2/${language}/Poe_Data_PassiveSkills_hover/[a-f0-9]+$`).test(url)) continue;
        if (map.has(id) && map.get(id) !== url) { map.delete(id); conflicts.add(id); }
        else map.set(id, url);
    }
    return map;
}

function parseHover(html) {
    const title = html.match(/<div class=["']itemName typeLine["'][^>]*>([\s\S]*?)<\/div>/i);
    const lines = [...html.matchAll(/<div class=["']implicitMod["'][^>]*>([\s\S]*?)<\/div>/gi)].map(m => plain(m[1]));
    if (!title || !lines.length || lines.some(line => !line)) return null;
    return { name: plain(title[1]), lines };
}

async function buildPassives(dictDir, services = { httpGet, mapConcurrent }) {
    const target = path.join(dictDir, 'passives.json');
    const old = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : { entries: [] };
    const previous = new Map(old.entries.map(entry => [entry.id, entry]));
    const stats = JSON.parse(fs.readFileSync(path.join(dictDir, 'stats.json'), 'utf8'));
    const requested = new Map();
    for (const cat of stats.result) for (const entry of cat.entries || []) {
        const id = entry.id?.match(/^enchant\.stat_2954116742\|(\d+)$/)?.[1];
        if (!id || !entry.text?.startsWith('Allocates ')) continue;
        const name = entry.text.slice('Allocates '.length).replace(/\[[^|\]]*\||[\][]/g, '').trim();
        if (!requested.has(id)) requested.set(id, name);
    }
    const seeds = [...requested.values()].slice(0, 3);
    let usIndex, twIndex;
    for (const name of seeds) {
        const slug = encodeURIComponent(name.replace(/\s+/g, '_'));
        const [us, tw] = await Promise.all(['us', 'tw'].map(lang => services.httpGet(`https://poe2db.tw/${lang}/${slug}`)));
        if (us.statusCode !== 200 || tw.statusCode !== 200) continue;
        const u = parseTreeIndex(us.body, 'us'), t = parseTreeIndex(tw.body, 'tw');
        if (u.size && t.size) { usIndex = u; twIndex = t; break; }
    }
    if (!usIndex || !twIndex) {
        console.warn(`[天赋说明] 双语索引不可用，保留已有 ${old.entries.length} 条，未覆盖的说明保持英文。`);
        if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(old, null, 2), 'utf8');
        return { available: old.entries.length, cached: old.entries.length, failed: requested.size };
    }
    let downloaded = 0, cached = 0, failed = 0, finished = 0;
    const entries = [];
    await services.mapConcurrent([...requested], 3, async ([id, name]) => {
        const urls = [usIndex.get(id), twIndex.get(id)];
        const existing = previous.get(id);
        try {
            if (!urls.every(Boolean)) { failed++; if (existing) { entries.push(existing); cached++; } return; }
            if (existing && existing.urls?.join('|') === urls.join('|')) { entries.push(existing); cached++; return; }
            const responses = await Promise.all(urls.map(url => services.httpGet(url, { timeout: 12000 })));
            const [us, tw] = responses.map(res => res.statusCode === 200 && typeof res.body === 'string' ? parseHover(res.body) : null);
            if (!us || !tw || us.name !== name || !/[\u3400-\u9fff]/.test(tw.name) || us.lines.join('\n') === tw.lines.join('\n')) {
                failed++; if (existing) { entries.push(existing); cached++; } return;
            }
            entries.push({ id, enName: us.name, twName: tw.name, en: us.lines, tw: tw.lines, urls });
            downloaded++;
        } finally {
            finished++;
            if (finished % 100 === 0) console.log(`[天赋说明] ${finished}/${requested.size}，新增或更新 ${downloaded}，缓存 ${cached}，未取得 ${failed}`);
        }
    });
    entries.sort((a, b) => Number(a.id) - Number(b.id));
    fs.writeFileSync(target, JSON.stringify({ version: 1, entries }, null, 2), 'utf8');
    console.log(`[天赋说明] ${entries.length} 条可用，更新 ${downloaded}，缓存 ${cached}，未取得 ${failed}`);
    return { available: entries.length, downloaded, cached, failed };
}

module.exports = { buildPassives, parseTreeIndex, parseHover };
if (require.main === module) buildPassives(path.resolve(__dirname, '../../dict/tw')).catch(error => { console.error(error); process.exitCode = 1; });
