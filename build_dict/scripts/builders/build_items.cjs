/**
 * 【独立业务模块 4：装备基底与暗金 (items.json)】
 * 架构：彻底废除下标猜测对齐，改用 PoE2DB 官方 CDN Autocomplete 权威中英文全量库
 * 进行 Slug 级精准对齐 + 定向抓取兜底
 */
const fs = require('fs');
const path = require('path');
const { fetchLatestAutocompleteJson, httpGet } = require('../fallback/poe2db_client.cjs');
const { cleanAndToSign } = require('../utils/clean_util.cjs');

async function buildItems(rawEnDir, rawTwDir, dictTwDir) {
    console.log('📦 [业务 4] 正在独立解析构建 items.json (基于 PoE2DB 权威映射)...');

    const enItems = JSON.parse(fs.readFileSync(path.join(rawEnDir, 'items.json'), 'utf8'));
    const enCats = enItems.result || enItems;

    // 1. 获取 PoE2DB 权威中英文词库
    const data = await fetchLatestAutocompleteJson();
    if (!data || !Array.isArray(data)) {
        throw new Error('无法拉取 PoE2DB 字典文件，请检查网络连接');
    }

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
            if (!entry.flags?.unique && entry.type) {
                const raw = entry.type.trim().toLowerCase();
                const noQuote = raw.replace(/['’]/g, '');
                const zh = slugMap.get(raw) || slugMap.get(noQuote) || slugMap.get(raw.replace(/\s+/g, '_'));
                if (zh) {
                    baseMap.set(entry.type, zh);
                }
            }
        }
    }
    console.log(`  🎯 基础装备基底精准对齐完成: ${baseMap.size} 种`);

    // 4. 对齐国际服全量装备 (基底与传奇)
    const builtItems = JSON.parse(JSON.stringify(enCats));
    let itemsTotal = 0;
    let poe2dbFound = 0;
    const initialMissingItems = [];

    for (const cat of builtItems) {
        for (const item of (cat.entries || [])) {
            itemsTotal++;
            const typeKey = item.type;
            const nameKey = item.name;
            const typeTw = baseMap.get(typeKey);

            if (nameKey) {
                // 传奇装备：分别对齐名字与基底
                const nameRaw = nameKey.trim().toLowerCase();
                const noQuote = nameRaw.replace(/['’]/g, '');
                const nameTw = slugMap.get(nameRaw) || slugMap.get(noQuote) || slugMap.get(nameRaw.replace(/\s+/g, '_'));

                if (nameTw && typeTw) {
                    item.zh_tw = { type: typeTw, name: nameTw, text: `${nameTw} ${typeTw}`, source: "poe2db" };
                    poe2dbFound++;
                } else if (nameTw) {
                    item.zh_tw = { type: typeTw || typeKey, name: nameTw, text: `${nameTw} ${typeTw || typeKey}`, source: "poe2db" };
                    poe2dbFound++;
                } else if (typeTw) {
                    item.zh_tw = { type: typeTw, name: nameKey, text: `${nameKey} ${typeTw}`, source: "poe2db_partial" };
                    poe2dbFound++;
                } else {
                    initialMissingItems.push({ cat: cat.id, item });
                }
            } else {
                // 普通基底 / 宝石 / 通货
                if (typeTw) {
                    item.zh_tw = { type: typeTw, source: "poe2db" };
                    poe2dbFound++;
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
                            poe2dbFound++;
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

    const finalUntranslated = [];
    if (initialMissingItems.length > 0) {
        console.log(`  🔍 针对剩余 ${initialMissingItems.length} 件未匹配条目进行定向爬取兜底...`);
        for (const { cat, item } of initialMissingItems) {
            const queryName = item.name || item.type;
            // 过滤官方内部调试/占位条目 (Do Not Translate)
            if (!queryName || queryName.includes('[DNT]')) {
                continue;
            }

            let foundFromWeb = false;
            const slugVariants = [
                encodeURIComponent(queryName.replace(/\s+/g, '_')),
                encodeURIComponent(queryName.replace(/['’]/g, '').replace(/\s+/g, '_'))
            ];

            for (const slug of slugVariants) {
                try {
                    const res = await httpGet(`https://poe2db.tw/tw/${slug}`, { timeout: 8000 });
                    if (res.statusCode === 200) {
                        const m = res.body.match(/<title>(.*?)<\/title>/i);
                        if (m) {
                            const cleanTitle = cleanAndToSign(m[1].replace(/\s*-\s*流亡.*$/, '').trim(), false);
                            if (cleanTitle && !cleanTitle.includes('404') && !cleanTitle.includes('Home') && !cleanTitle.includes('家園')) {
                                const curBaseTw = baseMap.get(item.type) || item.type;
                                item.zh_tw = item.name 
                                    ? { type: curBaseTw, name: cleanTitle, text: `${cleanTitle} ${curBaseTw}`, source: "poe2db_crawler" }
                                    : { type: cleanTitle, source: "poe2db_crawler" };
                                poe2dbFound++;
                                foundFromWeb = true;
                                break;
                            }
                        }
                    }
                } catch (_) {}
            }

            // 若网络偶发超时，安全回退继承上一次已对齐的正确数据
            if (!foundFromWeb) {
                const k = `${item.type || ''}__${item.name || ''}`;
                if (existingItemsMap.has(k)) {
                    item.zh_tw = existingItemsMap.get(k);
                    poe2dbFound++;
                    foundFromWeb = true;
                }
            }

            if (!foundFromWeb) {
                finalUntranslated.push({
                    cat,
                    type: item.type || '',
                    name: item.name || '',
                    text: item.text || item.type || ''
                });
            }
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
    const finalRate = `${((poe2dbFound / itemsTotal) * 100).toFixed(2)}%`;
    console.log(`  ✅ items.json 重新构建完成: 成功对齐 ${poe2dbFound} / ${itemsTotal} 件 (${finalRate})`);

    return {
        total: itemsTotal,
        officialTranslated: 0,
        missing: itemsTotal,
        poe2dbFound: poe2dbFound,
        poe2dbNotFound: finalUntranslated.length,
        finalTranslated: poe2dbFound,
        finalRate: finalRate,
        untranslated: finalUntranslated
    };
}

module.exports = { buildItems };
