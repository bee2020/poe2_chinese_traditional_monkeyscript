/**
 * 【独立业务模块 4：装备基底与暗金 (items.json)】
 * 逻辑：官方双源同位自解析 + PoE2DB 二级动态兜底对齐
 */
const fs = require('fs');
const path = require('path');
const { searchPoe2dbItems } = require('../fallback/fallback_items.cjs');

async function buildItems(rawEnDir, rawTwDir, dictTwDir) {
    console.log('📦 [业务 4] 正在独立解析构建 items.json...');

    const enItems = JSON.parse(fs.readFileSync(path.join(rawEnDir, 'items.json'), 'utf8'));
    const twItems = JSON.parse(fs.readFileSync(path.join(rawTwDir, 'items.json'), 'utf8'));

    const enCats = enItems.result || enItems;
    const twCats = twItems.result || twItems;

    // 1. 基础普通基底 1:1 提取
    const baseMap = new Map();
    for (const enCat of enCats) {
        const twCat = twCats.find(t => t.id === enCat.id);
        if (!twCat) continue;
        const enBases = enCat.entries.filter(e => !e.flags?.unique);
        const twBases = twCat.entries.filter(e => !e.flags?.unique);
        const limit = Math.min(enBases.length, twBases.length);
        for (let i = 0; i < limit; i++) {
            if (enBases[i].type && twBases[i].type) baseMap.set(enBases[i].type, twBases[i].type);
        }
    }

    // 2. 同一基底下的暗金 1:1 提取
    const uniqueNameMap = new Map();
    for (const enCat of enCats) {
        const twCat = twCats.find(t => t.id === enCat.id);
        if (!twCat) continue;
        const enUniques = enCat.entries.filter(e => e.flags?.unique);
        const twUniques = twCat.entries.filter(e => e.flags?.unique);

        const enByBase = new Map();
        for (const u of enUniques) {
            if (!enByBase.has(u.type)) enByBase.set(u.type, []);
            enByBase.get(u.type).push(u);
        }
        const twByBase = new Map();
        for (const u of twUniques) {
            if (!twByBase.has(u.type)) twByBase.set(u.type, []);
            twByBase.get(u.type).push(u);
        }

        for (const [enBaseType, uListEn] of enByBase.entries()) {
            const twBaseType = baseMap.get(enBaseType);
            const uListTw = twByBase.get(twBaseType);
            if (uListTw && uListTw.length > 0) {
                const subLimit = Math.min(uListEn.length, uListTw.length);
                for (let j = 0; j < subLimit; j++) {
                    uniqueNameMap.set(uListEn[j].name, uListTw[j].name);
                }
            }
        }
    }

    // 3. 官方初筛对齐
    const initialMissingItems = [];
    const builtItems = JSON.parse(JSON.stringify(enCats));
    let itemsTotal = 0;
    let officialItemsTranslated = 0;

    for (const cat of builtItems) {
        for (const item of (cat.entries || [])) {
            itemsTotal++;
            const typeKey = item.type;
            const nameKey = item.name;

            const typeTw = baseMap.get(typeKey);
            const nameTw = nameKey ? uniqueNameMap.get(nameKey) : null;

            if (nameKey) {
                if (nameTw && typeTw) {
                    item.zh_tw = { type: typeTw, name: nameTw, text: `${nameTw} ${typeTw}`, source: "official" };
                    officialItemsTranslated++;
                } else if (nameTw) {
                    item.zh_tw = { type: typeKey, name: nameTw, text: `${nameTw} ${typeKey}`, source: "official" };
                    officialItemsTranslated++;
                } else {
                    initialMissingItems.push(item);
                }
            } else {
                if (typeTw) {
                    item.zh_tw = { type: typeTw, source: "official" };
                    officialItemsTranslated++;
                } else {
                    initialMissingItems.push(item);
                }
            }
        }
    }

    // 4. 启动 PoE2DB 二级兜底对齐
    const poe2dbResult = await searchPoe2dbItems(initialMissingItems);
    let finalItemsTranslated = officialItemsTranslated;
    const untranslated = [];

    for (const item of initialMissingItems) {
        const key = item.name ? `unique_${item.name}` : `base_${item.type}`;
        const poe2dbZh = poe2dbResult.itemZhMap.get(key);

        if (poe2dbZh) {
            finalItemsTranslated++;
            if (item.name) {
                const parts = poe2dbZh.trim().split(/\s+/);
                let parsedName = poe2dbZh;
                let parsedType = baseMap.get(item.type) || item.type;

                if (parts.length >= 2) {
                    parsedName = parts[0];
                    parsedType = parts.slice(1).join(' ');
                }

                item.zh_tw = {
                    type: parsedType,
                    name: parsedName,
                    text: poe2dbZh,
                    source: 'poe2db'
                };
            } else {
                item.zh_tw = {
                    type: poe2dbZh,
                    source: 'poe2db'
                };
            }
        } else {
            untranslated.push(item);
        }
    }

    const targetFile = path.join(dictTwDir, 'items.json');
    fs.writeFileSync(targetFile, JSON.stringify(builtItems, null, 2), 'utf8');
    console.log(`  ✅ items.json 构建完成: 官方对齐 ${officialItemsTranslated} + PoE2DB 补全 ${poe2dbResult.foundCount} = 共 ${finalItemsTranslated} / ${itemsTotal} 件`);

    return {
        total: itemsTotal,
        officialTranslated: officialItemsTranslated,
        missing: initialMissingItems.length,
        poe2dbFound: poe2dbResult.foundCount,
        poe2dbNotFound: poe2dbResult.notFoundCount,
        finalTranslated: finalItemsTranslated,
        finalRate: `${((finalItemsTranslated / itemsTotal) * 100).toFixed(2)}%`,
        untranslated
    };
}

module.exports = { buildItems };
