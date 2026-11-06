/**
 * 【独立业务模块 4：装备基底与暗金 (items.json)】
 * 架构：彻底废除下标猜测对齐，改用 PoE2DB 官方 CDN Autocomplete 权威中英文全量库
 * 进行 Slug 级精准对齐 + 定向抓取兜底
 */
const fs = require('fs');
const path = require('path');
const { fetchLatestAutocompleteJson, httpGet } = require('../fallback/poe2db_client.cjs');
const { cleanAndToSign } = require('../utils/clean_util.cjs');
const { summarizeItems, translated, itemState } = require('../utils/report_util.cjs');

async function buildItems(rawEnDir, rawTwDir, dictTwDir, services = { fetchLatestAutocompleteJson, httpGet }) {
    console.log('📦 [业务 4] 正在独立解析构建 items.json (基于 PoE2DB 权威映射)...');

    const enItems = JSON.parse(fs.readFileSync(path.join(rawEnDir, 'items.json'), 'utf8'));
    const enCats = enItems.result || enItems;

    // 1. 获取 PoE2DB 权威中英文词库
    const fetched = await services.fetchLatestAutocompleteJson();
    const data = Array.isArray(fetched) ? fetched : [];
    if (!Array.isArray(fetched)) console.warn('PoE2DB 索引不可用，将逐字段尝试已有缓存与定向补全。');

    // 2. 建立精准的 Slug 映射表 (通用支持 URL 解码、下划线、连字符、空格、忽略单引号等多种容错)
    const slugMap = new Map();
    for (const item of data) {
        if (!item.value || !item.label) continue;
        let vDecoded = item.value;
        try { vDecoded = decodeURIComponent(item.value); } catch (_) {}
        const v = vDecoded.toLowerCase();
        const l = item.label;
        slugMap.set(v, l);
        slugMap.set(v.replace(/_/g, ' '), l);
        slugMap.set(v.replace(/-/g, ' '), l);
        const noQuote = v.replace(/['’]/g, '');
        slugMap.set(noQuote, l);
        slugMap.set(noQuote.replace(/_/g, ' '), l);
    }

    // 3. 构建精准的基底映射字典 (Base Types)
    const baseMap = new Map();
    for (const cat of enCats) {
        for (const entry of (cat.entries || [])) {
            if (entry.type) {
                const raw = entry.type.trim().toLowerCase();
                const noQuote = raw.replace(/['’]/g, '');
                const zh = slugMap.get(raw) || slugMap.get(noQuote) || slugMap.get(raw.replace(/\s+/g, '_'));
                if (translated(entry.type, zh)) {
                    baseMap.set(entry.type, zh);
                }
            }
        }
    }
    console.log(`  🎯 基础装备基底精准对齐完成: ${baseMap.size} 种`);

    // 4. 对齐国际服全量装备 (基底与传奇)
    const builtItems = JSON.parse(JSON.stringify(enCats));
    const initialMissingItems = [];

    for (const cat of builtItems) {
        for (const item of (cat.entries || [])) {
            if (itemState(item) === 'excluded') continue;
            const typeKey = item.type;
            const nameKey = item.name;
            const typeTw = baseMap.get(typeKey);

            if (nameKey) {
                // 传奇装备：分别对齐名字与基底
                const nameRaw = nameKey.trim().toLowerCase();
                const noQuote = nameRaw.replace(/['’]/g, '');
                const mappedName = slugMap.get(nameRaw) || slugMap.get(noQuote) || slugMap.get(nameRaw.replace(/\s+/g, '_'));
                const nameTw = translated(nameKey, mappedName) ? mappedName : undefined;

                if (nameTw && typeTw) {
                    item.zh_tw = { type: typeTw, name: nameTw, text: `${nameTw} ${typeTw}`, source: "poe2db" };
                } else if (nameTw) {
                    item.zh_tw = { type: typeTw || typeKey, name: nameTw, text: `${nameTw} ${typeTw || typeKey}`, source: "poe2db_partial" };
                    initialMissingItems.push({ cat: cat.id, item });
                } else if (typeTw) {
                    item.zh_tw = { type: typeTw, name: nameKey, text: `${nameKey} ${typeTw}`, source: "poe2db_partial" };
                    initialMissingItems.push({ cat: cat.id, item });
                } else {
                    initialMissingItems.push({ cat: cat.id, item });
                }
            } else {
                // 普通基底 / 宝石 / 通货
                if (typeTw) {
                    item.zh_tw = { type: typeTw, source: "poe2db" };
                } else {
                    // 通用动态解析带 (Tier/Level X) 的规格后缀（绝不硬编码任何装备/宝石名称）
                    const bracketMatch = typeKey ? typeKey.match(/^(.+?)\s*\((Tier|Level)\s*(\d+)\)$/i) : null;
                    if (bracketMatch) {
                        const baseEn = bracketMatch[1].trim();
                        const kind = bracketMatch[2].toLowerCase() === 'tier' ? '階級' : '等級';
                        const num = bracketMatch[3];

                        // 动态查找基底繁中名（支持单数与复数动态容错）
                        const baseZh = baseMap.get(baseEn)
                            || slugMap.get(baseEn.toLowerCase())
                            || slugMap.get(baseEn.toLowerCase().replace(/\s+/g, '_'))
                            || slugMap.get((baseEn + 's').toLowerCase().replace(/\s+/g, '_'));

                        if (baseZh) {
                            const formattedType = `${baseZh}（${kind} ${num}）`;
                            item.zh_tw = { type: formattedType, source: "dynamic_format" };
                            continue;
                        }
                    }
                    initialMissingItems.push({ cat: cat.id, item });
                }
            }
        }
    }

    // 5. 针对极少数未收录条目发起定向爬取兜底 (支持单引号容错、重试与既有字典缓存继承，绝不因单次超时而抹空)
    const existingItemsMap = new Map();
    const existingFile = path.join(dictTwDir, 'items.json');
    if (fs.existsSync(existingFile)) {
        try {
            const oldData = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
            for (const cat of (oldData || [])) {
                for (const e of (cat.entries || [])) {
                    if (e.zh_tw && (e.zh_tw.text || e.zh_tw.type || e.zh_tw.name)) {
                        const k = `${e.type || ''}__${e.name || ''}`;
                        existingItemsMap.set(k, e.zh_tw);
                    }
                }
            }
        } catch (_) {}
    }

    for (const { item } of initialMissingItems) {
        // 按字段补全；部分翻译不能因名称或基底已命中而提前退出。
        const cached = existingItemsMap.get(`${item.type || ''}__${item.name || ''}`) || {};
        const zh = { ...item.zh_tw };
        for (const field of ['type', 'name']) {
            if (!item[field] || translated(item[field], zh[field])) continue;
            if (translated(item[field], cached[field])) {
                zh[field] = cached[field];
                zh.source = 'cache';
                continue;
            }
            const query = item[field];
            const variants = new Set([
                encodeURIComponent(query.replace(/\s+/g, '_')),
                encodeURIComponent(query.replace(/['’]/g, '').replace(/\s+/g, '_'))
            ]);
            for (const slug of variants) {
                try {
                    const url = `https://poe2db.tw/tw/${slug}`;
                    const res = await services.httpGet(url, { timeout: 8000 });
                    if (res.statusCode !== 200 || typeof res.body !== 'string') continue;
                    if (res.url && decodeURIComponent(new URL(res.url).pathname) !== decodeURIComponent(new URL(url).pathname)) continue;
                    const match = res.body.match(/<title>(.*?)<\/title>/i);
                    if (!match) continue;
                    const title = cleanAndToSign(match[1].replace(/\s*-\s*(?:流亡|PoE).*$/i, '').trim());
                    if (!/[\u3400-\u9fff]/.test(title) || /404|Home|家園/i.test(title)) continue;
                    zh[field] = title;
                    zh.source = 'poe2db_crawler';
                    break;
                } catch (_) { /* 请求失败时保留已经获得的字段。 */ }
            }
        }
        if (['type', 'name'].some(field => translated(item[field], zh[field]))) {
            if (item.name) zh.text = `${zh.name || item.name} ${zh.type || item.type}`;
            item.zh_tw = zh;
        }
    }

    // 6. 排序并写入 dict/tw/items.json
    for (const cat of builtItems) {
        if (Array.isArray(cat.entries)) {
            cat.entries.sort((a, b) => {
                const keyA = `${a.type || ''}_${a.name || ''}`;
                const keyB = `${b.type || ''}_${b.name || ''}`;
                return keyA.localeCompare(keyB);
            });
        }
    }

    const targetFile = path.join(dictTwDir, 'items.json');
    fs.writeFileSync(targetFile, JSON.stringify(builtItems, null, 2), 'utf8');
    const summary = summarizeItems(builtItems);
    console.log(`  ✅ items.json: 完整 ${summary.complete}，部分 ${summary.partial}，缺失 ${summary.missing}，排除 ${summary.excluded}；完整率 ${summary.finalRate}`);
    return { ...summary, lookupStatus: Array.isArray(fetched) ? 'index-available' : 'cache-fallback' };
}

module.exports = { buildItems };
