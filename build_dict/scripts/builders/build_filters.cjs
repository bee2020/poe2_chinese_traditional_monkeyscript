/**
 * 【独立业务模块 2：市集筛选器配置 (filters.json)】
 * 逻辑：基于官方原生分类 ID + 选项 ID 100% 强绑定匹配
 * 全面覆盖：
 * 1. cat.title 分类大标题 (如 裝備篩選器, 物品需求, 終局篩選器)
 * 2. f.text 筛选器条目标题 (如 傷害, 護甲, 換界石階級, 寶石等級)
 * 3. opt.text 下拉选项 (如 崇高石, 混沌石, 是, 否, 任何)
 */
const fs = require('fs');
const path = require('path');

function buildFilters(rawEnDir, rawTwDir, dictTwDir) {
    console.log('🔍 [业务 2] 正在独立解析构建 filters.json...');

    const enFilters = JSON.parse(fs.readFileSync(path.join(rawEnDir, 'filters.json'), 'utf8'));
    const twFilters = JSON.parse(fs.readFileSync(path.join(rawTwDir, 'filters.json'), 'utf8'));

    const rawTwCats = twFilters.result || twFilters;
    const twCatMap = new Map();
    const twFilterItemMap = new Map();
    const twOptionMap = new Map();

    for (const cat of rawTwCats) {
        if (cat.title) {
            twCatMap.set(cat.id, cat.title);
        }
        for (const f of (cat.filters || [])) {
            if (f.text) {
                twFilterItemMap.set(`${cat.id}_${f.id}`, f.text);
            }
            for (const opt of (f.option?.options || [])) {
                twOptionMap.set(`${cat.id}_${f.id}_${opt.id}`, opt.text);
            }
        }
    }

    const builtFilters = JSON.parse(JSON.stringify(enFilters.result || enFilters));
    let translatedOpts = 0;
    let totalOpts = 0;
    let translatedFilters = 0;
    let totalFilters = 0;

    for (const cat of builtFilters) {
        // 1. 注入分类大标题繁中
        const catTwTitle = twCatMap.get(cat.id);
        if (catTwTitle) {
            cat.zh_tw = { title: catTwTitle, source: "official" };
        }

        for (const f of (cat.filters || [])) {
            totalFilters++;
            // 2. 注入条目标题繁中 (如 Armour -> 護甲, Damage -> 傷害)
            const fTwText = twFilterItemMap.get(`${cat.id}_${f.id}`);
            if (fTwText) {
                f.zh_tw = { text: fTwText, source: "official" };
                translatedFilters++;
            }

            // 3. 注入下拉框选项繁中
            for (const opt of (f.option?.options || [])) {
                totalOpts++;
                const key = `${cat.id}_${f.id}_${opt.id}`;
                const twText = twOptionMap.get(key);
                if (twText !== undefined) {
                    opt.zh_tw = { text: twText, source: "official" };
                    translatedOpts++;
                }
            }
        }
    }

    const targetFile = path.join(dictTwDir, 'filters.json');
    fs.writeFileSync(targetFile, JSON.stringify({ result: builtFilters }, null, 2), 'utf8');
    console.log(`  ✅ filters.json 构建完成: 成功对齐 ${translatedFilters} / ${totalFilters} 个筛选器条目, ${translatedOpts} / ${totalOpts} 个下拉选项`);

    return {
        totalFilters,
        translatedFilters,
        totalOpts,
        translatedOpts
    };
}

module.exports = { buildFilters };
