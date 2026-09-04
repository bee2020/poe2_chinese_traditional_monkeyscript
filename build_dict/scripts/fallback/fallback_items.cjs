/**
 * 【业务分立模块：装备物品 PoEDB 纯动态兜底匹配器 (fallback_items.cjs)】
 * 职责：专注装备与暗金物品的纯动态 CDN 初筛与空状态定向查补，彻底与词缀逻辑解耦
 */
const { httpGet, fetchLatestAutocompleteJson, mapConcurrent } = require('./poe2db_client.cjs');
const { cleanAndToSign } = require('../utils/clean_util.cjs');

async function searchPoe2dbItems(untranslatedItems) {
    console.log(`\n🌐 启动装备物品动态匹配流程 (待对齐空状态: ${untranslatedItems.length} 件)...`);
    const data = await fetchLatestAutocompleteJson();

    const itemZhMap = new Map();
    let foundCount = 0;
    const remainingEmpty = [];

    // 阶段 1: CDN 全量字典闪电初筛 (含撇号智能容错)
    if (data && Array.isArray(data)) {
        const slugMap = new Map();
        for (const item of data) {
            if (item.value && item.label) {
                const v = item.value.toLowerCase();
                const l = item.label;
                slugMap.set(v, l);
                slugMap.set(v.replace(/_/g, ' '), l);
                const noQuote = v.replace(/['’]/g, '');
                slugMap.set(noQuote, l);
                slugMap.set(noQuote.replace(/_/g, ' '), l);
            }
        }

        for (const item of untranslatedItems) {
            const raw = (item.name || item.type).trim().toLowerCase();
            const noQuote = raw.replace(/['’]/g, '');

            const zh = slugMap.get(raw)
                    || slugMap.get(raw.replace(/\s+/g, '_'))
                    || slugMap.get(noQuote)
                    || slugMap.get(noQuote.replace(/\s+/g, '_'));

            if (zh) {
                foundCount++;
                const key = item.name ? `unique_${item.name}` : `base_${item.type}`;
                itemZhMap.set(key, zh);
            } else {
                remainingEmpty.push(item);
            }
        }
    } else {
        remainingEmpty.push(...untranslatedItems);
    }

    console.log(`  ⚡ CDN 字典初筛命中: ${foundCount} 件，捕获到 ${remainingEmpty.length} 个空状态条目`);

    // 阶段 2: 针对初筛后仍处于“空状态”的极少数装备发起动态定向直查
    if (remainingEmpty.length > 0) {
        console.log(`  🎯 正在针对 ${remainingEmpty.length} 件空状态装备发起动态定向检索...`);
        await mapConcurrent(remainingEmpty, 3, async (item) => {
            const name = item.name || item.type;
            const slugs = [
                name.replace(/\s+/g, '_'),
                name.replace(/['’]/g, '').replace(/\s+/g, '_')
            ];

            for (const slug of slugs) {
                const res = await httpGet(`https://poe2db.tw/tw/${encodeURIComponent(slug)}`);
                if (res.statusCode === 200) {
                    const m = res.body.match(/<title>(.*?)<\/title>/i);
                    if (m) {
                        const rawTitle = m[1].replace(/\s*-\s*流亡.*$/, '').trim();
                        const cleanTitle = cleanAndToSign(rawTitle, false);
                        if (cleanTitle && !cleanTitle.includes('404') && !cleanTitle.includes('Home') && !cleanTitle.includes('家園')) {
                            foundCount++;
                            const key = item.name ? `unique_${item.name}` : `base_${item.type}`;
                            itemZhMap.set(key, cleanTitle);
                            break;
                        }
                    }
                }
            }
        });
    }

    const notFoundCount = untranslatedItems.length - foundCount;
    console.log(`  ✅ 装备动态对齐执行完成: 成功对齐 ${foundCount} 件, 最终未对齐 ${notFoundCount} 件`);
    return { foundCount, notFoundCount, itemZhMap };
}

module.exports = { searchPoe2dbItems };
