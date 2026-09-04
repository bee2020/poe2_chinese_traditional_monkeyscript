/**
 * 【独立业务模块 3：核心词缀与属性 (stats.json)】
 * 架构：官方机器 stat_编号 ID 强对齐 + 官方分类跨前缀穿透 + PoE2DB 二级动态兜底
 */
const fs = require('fs');
const path = require('path');
const { searchPoe2dbStats } = require('../fallback/fallback_stats.cjs');

async function buildStats(rawEnDir, rawTwDir, dictTwDir) {
    console.log('⚔️ [业务 3] 正在独立解析构建 stats.json (官方机器 ID 强对齐 + PoE2DB 兜底)...');

    const enStats = JSON.parse(fs.readFileSync(path.join(rawEnDir, 'stats.json'), 'utf8'));
    const twStats = JSON.parse(fs.readFileSync(path.join(rawTwDir, 'stats.json'), 'utf8'));

    // 1. 建立台服官方机器 ID 映射 (支持精确 ID 与剥离分类前缀的核心编号)
    const exactStatsMap = new Map();
    const coreKeyStatsMap = new Map();

    for (const cat of (twStats.result || twStats)) {
        for (const entry of (cat.entries || [])) {
            if (entry.id && entry.text !== undefined) {
                exactStatsMap.set(entry.id, entry.text);
                const prefix = `${cat.id}.`;
                const coreKey = entry.id.startsWith(prefix) ? entry.id.slice(prefix.length) : entry.id;
                if (!coreKeyStatsMap.has(coreKey)) {
                    coreKeyStatsMap.set(coreKey, entry.text);
                }
            }
        }
    }

    // 2. 遍历国际服，进行官方 ID 初筛对齐
    const builtStats = JSON.parse(JSON.stringify(enStats.result || enStats));
    let officialStatsTranslated = 0;
    let totalCount = 0;
    const initialMissingStats = [];
    const officialPairs = [];

    for (const cat of builtStats) {
        for (const entry of (cat.entries || [])) {
            totalCount++;
            // 步骤 A: 优先按原样完整 ID 匹配 (如 explicit.stat_1286199571)
            let twText = exactStatsMap.get(entry.id);

            // 步骤 B: 若跨分类则按 stat_xxxx 机器码归一化对撞
            if (twText === undefined) {
                const prefix = `${cat.id}.`;
                const coreKey = entry.id.startsWith(prefix) ? entry.id.slice(prefix.length) : entry.id;
                twText = coreKeyStatsMap.get(coreKey);
            }

            if (twText !== undefined) {
                entry.zh_tw = { text: twText, source: "official" };
                officialStatsTranslated++;
                officialPairs.push({ en: entry.text, tw: twText });
            } else {
                initialMissingStats.push({ category: cat.id, id: entry.id, text: entry.text, entryRef: entry });
            }
        }
    }

    // 3. 启动通用匹配引擎 (传入官方双语作为语料学习基底)
    const poe2dbResult = await searchPoe2dbStats(initialMissingStats, officialPairs);
    let finalStatsTranslated = officialStatsTranslated;
    const finalUntranslated = [];

    for (const item of initialMissingStats) {
        const poe2dbZh = poe2dbResult.statZhMap.get(item.id);
        if (poe2dbZh) {
            finalStatsTranslated++;
            item.entryRef.zh_tw = { text: poe2dbZh.text, source: poe2dbZh.source || "poe2db" };
        } else {
            finalUntranslated.push({ category: item.category, id: item.id, en: item.text });
        }
    }

    // 4. 母子分类血缘穿透对齐 (fractured / crafted / desecrated 衍生分类继承显式母词缀)
    const explicitMap = new Map();
    const explicitCat = builtStats.find(c => c.id === 'explicit');
    if (explicitCat) {
        for (const e of (explicitCat.entries || [])) {
            if (e.zh_tw) {
                const coreId = e.id.replace(/^explicit\./, '');
                explicitMap.set(coreId, e.zh_tw);
            }
        }
    }

    const cognateCats = ['fractured', 'crafted', 'desecrated'];
    for (const cat of builtStats) {
        if (cognateCats.includes(cat.id)) {
            for (const entry of (cat.entries || [])) {
                if (!entry.zh_tw) {
                    const coreId = entry.id.replace(new RegExp(`^${cat.id}\\.`), '');
                    const parent = explicitMap.get(coreId);
                    if (parent) {
                        entry.zh_tw = { text: parent.text, source: "parent_explicit" };
                        finalStatsTranslated++;
                        const unIdx = finalUntranslated.findIndex(u => u.id === entry.id);
                        if (unIdx !== -1) finalUntranslated.splice(unIdx, 1);
                    }
                }
            }
        }
    }

    const targetFile = path.join(dictTwDir, 'stats.json');
    fs.writeFileSync(targetFile, JSON.stringify({ result: builtStats }, null, 2), 'utf8');
    console.log(`  ✅ stats.json 构建完成: 官方对齐 ${officialStatsTranslated} + PoE2DB 兜底 ${poe2dbResult.foundCount} = 共 ${finalStatsTranslated} / ${totalCount} 条`);

    return {
        total: totalCount,
        officialTranslated: officialStatsTranslated,
        missing: initialMissingStats.length,
        poe2dbFound: finalStatsTranslated - officialStatsTranslated,
        poe2dbNotFound: finalUntranslated.length,
        finalTranslated: finalStatsTranslated,
        finalRate: `${((finalStatsTranslated / totalCount) * 100).toFixed(2)}%`,
        untranslated: finalUntranslated
    };
}

module.exports = { buildStats };
