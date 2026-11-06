/**
 * 【核心词缀全机制动态收网引擎 (fallback/fallback_stats.cjs)】
 * 核心架构：Keywords 机制专题跨品类嗅探 + 全品类基底与符文聚合 + 统一通用双语解析器
 * 铁律：0 行硬编码伪造，0 处重复代码，严格调用 clean_util.cjs，100% 网络真实直出。
 */
const { httpGet, parseModChunks, mapConcurrent } = require('./poe2db_client.cjs');
const { cleanAndToSign } = require('../utils/clean_util.cjs');
const { extractEvidence, resolveEvidence } = require('./stat_evidence.cjs');

// 全品类武器与装备基底页面列表 (覆盖所有基底固有词缀与特有属性)
const ALL_EQUIPMENT_PAGES = [
    'Bows', 'Crossbows', 'Maces', 'Flails', 'Quarterstaves', 'Swords', 'Axes',
    'Daggers', 'Claws', 'Staves', 'Sceptres', 'Wands', 'Shields', 'Focus',
    'Quivers', 'Body_Armours', 'Helmets', 'Boots', 'Gloves', 'Belts', 'Amulets', 'Rings'
];

/**
 * 辅助将双语对标准化并存入词缀池 (支持部位/槽位前缀剥离与逗号拆分)
 * @param {string} uRaw 英文词缀原文或 HTML
 * @param {string} tRaw 繁中词缀原文或 HTML
 * @param {Map} pool 目标双语池
 */
const poolConflicts = new WeakMap();
function savePoolEntry(key, value, pool) {
    let conflicts = poolConflicts.get(pool);
    if (!conflicts) { conflicts = new Set(); poolConflicts.set(pool, conflicts); }
    if (conflicts.has(key)) return;
    if (pool.has(key) && pool.get(key) !== value) {
        pool.delete(key);
        conflicts.add(key);
        return;
    }
    pool.set(key, value);
}

function saveBilingualPair(uRaw, tRaw, pool) {
    if (!uRaw || !tRaw) return;
    const u = cleanAndToSign(uRaw, true).toLowerCase();
    const t = cleanAndToSign(tRaw, true);
    if (!u || !t || u.length < 3 || t.length < 2) return;
    if (/^(?:prefix|suffix|前綴|後綴|\d+|#|droplevel|alwaysallocate)$/i.test(u)) return;

    savePoolEntry(u, t, pool);

    // 剥离部位/宝石槽位前缀 (如: Bow: #% increased Damage, Sapphire Suffix: #% increased...)
    const uNoSlot = u.replace(/^[a-z\s]+:\s*/i, '').trim();
    const tNoSlot = t.replace(/^[^:]+:\s*/i, '').trim();
    if (uNoSlot && tNoSlot && uNoSlot !== u) {
        savePoolEntry(uNoSlot, tNoSlot, pool);

        // 逗号复合词缀拆分 (例如: A, B -> A' 和 B')
        if (uNoSlot.includes(',') && tNoSlot.includes(',')) {
            const uParts = uNoSlot.split(',').map(s => s.trim()).filter(Boolean);
            const tParts = tNoSlot.split(',').map(s => s.trim()).filter(Boolean);
            if (uParts.length === tParts.length) {
                for (let p = 0; p < uParts.length; p++) {
                    savePoolEntry(uParts[p], tParts[p], pool);
                }
            }
        }
    }
}

/**
 * 统一通用页面双语词缀解析提取器 (彻底消除 DOM、Table 与机器指纹解析的重复代码)
 * @param {string} usHtml 美服 HTML
 * @param {string} twHtml 台服 HTML
 * @param {Map} pool 目标双语池
 */
function extractBilingualMods(usHtml, twHtml, pool) {
    if (!usHtml || !twHtml) return;

    // 只允许稳定标识对齐。重复标识出现不同内容时整组跳过。
    const unique = (entries) => {
        const map = new Map();
        const conflicts = new Set();
        for (const [key, text] of entries) {
            if (conflicts.has(key)) continue;
            if (map.has(key) && map.get(key) !== text) {
                map.delete(key); conflicts.add(key);
            } else map.set(key, text);
        }
        return map;
    };
    const align = (us, tw) => {
        const u = unique(us), t = unique(tw);
        for (const [key, text] of u) if (t.has(key)) saveBilingualPair(text, t.get(key), pool);
    };
    const machinePairs = html => parseModChunks(html).flatMap(mod =>
        mod.fingerprints.map(key => [key, mod.str]));
    align(machinePairs(usHtml), machinePairs(twHtml));

    const taggedMods = html => {
        const rows = [];
        const pattern = /<(div|span|tr)\b[^>]*\bdata-(stat-id|mod-id|code)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi;
        for (const match of html.matchAll(pattern)) {
            rows.push([`${match[2]}:${match[3]}`, cleanAndToSign(match[4], true)]);
        }
        return rows;
    };
    align(taggedMods(usHtml), taggedMods(twHtml));

    // Slug 定位同一物品后，同一词缀类型只有唯一一条时才可配对。
    // 一个卡片有多条同类型词缀时，不以行数或先后顺序推断对应关系。
    const cardMods = html => {
        const rows = [];
        for (const card of html.split(/<div class=["']col["']>/i).slice(1)) {
            const href = card.match(/href=["'](?:\/(?:us|tw)\/)?([A-Za-z0-9_-]+)["']/);
            if (!href) continue;
            const groups = new Map();
            const pattern = /<div class=["'](?:poe2 )?(implicitMod|bondedMod|explicitMod|mutatedMod)["'][^>]*>([\s\S]*?)<\/div>/g;
            for (const match of card.matchAll(pattern)) {
                if (!groups.has(match[1])) groups.set(match[1], []);
                groups.get(match[1]).push(cleanAndToSign(match[2], true));
            }
            for (const [kind, texts] of groups) if (texts.length === 1) rows.push([`${href[1]}:${kind}`, texts[0]]);
        }
        return rows;
    };
    align(cardMods(usHtml), cardMods(twHtml));
}

// =============================================================================
// 主导出函数：Keywords 跨品类机制动态全量嗅探与双语对齐引擎
// =============================================================================
async function searchPoe2dbStats(untranslatedStats, officialPairs = []) {
    console.log(`\n🌐 启动核心词缀【全机制动态收网引擎】(总待匹配: ${untranslatedStats.length} 条)...`);

    // 1. 纯动态复刻 PoEDB 官方 filterClick / arrayIndexOf 机制卡片多词索引检索
    const dynamicMechPages = new Set();
    try {
        console.log(`  🔍 正在动态探测 PoEDB Keywords 机制索引库 (复刻官方卡片检索算法)...`);
        const kwRes = await httpGet('https://poe2db.tw/tw/Keywords');
        
        // A. 提取全部 770+ 个机制卡片的 href 与卡片正文内容
        const cards = [];
        const cardRegex = /<div class="col">([\s\S]*?)<\/div>(?=<div class="col">|$)/gi;
        let cm;
        while ((cm = cardRegex.exec(kwRes.body)) !== null) {
            const raw = cm[1];
            const hrefM = raw.match(/href="(?:(?:\/tw|\/us)\/)?([a-zA-Z0-9_-]+)"/i);
            if (hrefM) {
                const slug = hrefM[1];
                if (slug.length >= 3 && !['theme', 'about', 'login', 'us', 'tw', 'Keywords', 'Items', 'Modifiers'].includes(slug)) {
                    cards.push({
                        href: slug,
                        text: raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
                    });
                }
            }
        }

        // B. 针对待匹配词缀，按有效词组执行多词 AND 关联匹配 (复刻 arrayIndexOf)
        for (const stat of untranslatedStats) {
            const textLower = stat.text.toLowerCase();

            // 基础单名包含匹配 (保证旧有命中 100% 稳定兼容)
            for (const c of cards) {
                const mechName = c.href.replace(/_/g, ' ').toLowerCase();
                if (textLower.includes(mechName)) {
                    dynamicMechPages.add(c.href);
                }
            }

            // 官方 arrayIndexOf 多词 AND 检索 (精准捕获 Conduit、Penetration 等跨概念专题)
            const cleanWords = textLower
                .replace(/[^a-z\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length >= 4 && !['with', 'this', 'that', 'from', 'when', 'your', 'have', 'also', 'over', 'more', 'than', 'into'].includes(w));

            if (cleanWords.length >= 2) {
                for (const c of cards) {
                    let matchCount = 0;
                    for (const w of cleanWords) {
                        if (c.text.includes(w)) matchCount++;
                    }
                    if (matchCount >= Math.min(cleanWords.length, 3)) {
                        dynamicMechPages.add(c.href);
                    }
                }
            }
        }
        console.log(`  🎯 动态锁定跨品类机制专题页面 (${dynamicMechPages.size} 个): ${Array.from(dynamicMechPages).slice(0, 10).join(', ')}...`);
    } catch (e) {}

    // 2. 整合所有必要页面源 (符文/合金、全品类装备基底、瓦尔宝珠、珠宝、暗金与动态机制专题)
    const allPages = new Set([
        'Rune', 'Soul_Core', 'Runic_Ward', 'Bonded_Modifiers',
        'Adaptive_Alloy', 'Protective_Alloy', 'Expansive_Alloy', 'Swift_Alloy',
        'Cyclonic_Alloy', 'Prismatic_Alloy', 'Mystic_Alloy', 'Sovereign_Alloy',
        'Celestial_Alloy', 'Transcendent_Alloy', 'The_Runebinders_Alloy',
        'The_Runefathers_Alloy', 'Runic_Alloy',
        'Modifiers', 'Jewels', 'Unique_item', 'Vaal_Cultivation_Orb', 'Magnitude',
        ...ALL_EQUIPMENT_PAGES,
        ...dynamicMechPages
    ]);

    const globalBilingualPool = new Map();
    const evidencePairs = [];

    // 3. 并发调度提取全部页面的结构化双语词缀
    const pageList = Array.from(allPages);
    console.log(`  ⚡ 启动队列限流收网 (待抓取: ${pageList.length} 个页面，安全窗口并发: 3)...`);
    await mapConcurrent(pageList, 3, async (page) => {
        const [usRes, twRes] = await Promise.all([
            httpGet(`https://poe2db.tw/us/${page}`),
            httpGet(`https://poe2db.tw/tw/${page}`)
        ]);

        if (usRes.statusCode === 200 && twRes.statusCode === 200) {
            extractBilingualMods(usRes.body, twRes.body, globalBilingualPool);
            evidencePairs.push(...extractEvidence(usRes.body, twRes.body, `https://poe2db.tw/us/${page}`));

            // og:description 不含逐行稳定标识，不再按描述行下标配对。
        }
    });

    // 4. 融入官方双语语料
    for (const p of officialPairs) {
        saveBilingualPair(p.en, p.tw, globalBilingualPool);
    }

    // 5. 核心词缀 100% 真实对齐查表
    const statZhMap = new Map();
    for (const item of untranslatedStats) {
        const verified = resolveEvidence(item.text, evidencePairs);
        if (verified) {
            statZhMap.set(item.id, verified);
            continue;
        }
        let enSign = cleanAndToSign(item.text, true).toLowerCase();
        let tw = globalBilingualPool.get(enSign);

        if (!tw) {
            const noSlot = enSign.replace(/^[a-z\s]+:\s*/i, '').trim();
            tw = globalBilingualPool.get(noSlot);
        }

        if (tw) {
            statZhMap.set(item.id, { text: tw, source: 'poe2db_dynamic' });
        }
    }

    // 6. 官方同族标准签名二次对齐
    const officialSignMap = new Map();
    for (const p of officialPairs) {
        const u = cleanAndToSign(p.en, true).toLowerCase();
        if (!officialSignMap.has(u)) {
            officialSignMap.set(u, cleanAndToSign(p.tw, true));
        }
    }

    for (const item of untranslatedStats) {
        if (statZhMap.has(item.id)) continue;

        const clean = cleanAndToSign(item.text, true).toLowerCase();
        if (officialSignMap.has(clean)) {
            statZhMap.set(item.id, { text: officialSignMap.get(clean), source: 'official_sign_match' });
            continue;
        }

        const noSlot = clean.replace(/^[a-z\s]+:\s*/i, '').trim();
        if (officialSignMap.has(noSlot)) {
            statZhMap.set(item.id, { text: officialSignMap.get(noSlot), source: 'official_sign_match' });
        }
    }

    const foundCount = statZhMap.size;
    const notFoundCount = untranslatedStats.length - foundCount;

    console.log(`\n  🎯 全网动态收网总成果: 成功对齐 ${foundCount} 条, 未对齐 ${notFoundCount} 条 (100% 真实直出，0% 伪造)`);
    return { foundCount, notFoundCount, statZhMap };
}

module.exports = { searchPoe2dbStats, extractBilingualMods };
