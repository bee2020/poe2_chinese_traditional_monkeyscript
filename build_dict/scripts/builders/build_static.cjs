/**
 * 【独立业务模块 1：通货与道具 (static.json)】
 * 逻辑：基于官方原生 entry.id 100% 强绑定匹配
 */
const fs = require('fs');
const path = require('path');

function buildStatic(rawEnDir, rawTwDir, dictTwDir) {
    console.log('💎 [业务 1] 正在独立解析构建 static.json...');

    const enStatic = JSON.parse(require('fs').readFileSync(path.join(rawEnDir, 'static.json'), 'utf8'));
    const twStatic = JSON.parse(require('fs').readFileSync(path.join(rawTwDir, 'static.json'), 'utf8'));

    // 1. 建立台服官方通货 ID 映射表
    const twStaticMap = new Map();
    for (const cat of (twStatic.result || twStatic)) {
        for (const entry of (cat.entries || [])) {
            if (entry.id && entry.text !== undefined) {
                twStaticMap.set(entry.id, entry.text);
            }
        }
    }

    // 2. 遍历国际服英文，基于 ID 注入繁中 zh_tw
    const builtStatic = JSON.parse(JSON.stringify(enStatic.result || enStatic));
    let translatedCount = 0;
    let totalCount = 0;
    const untranslated = [];

    for (const cat of builtStatic) {
        for (const entry of (cat.entries || [])) {
            totalCount++;
            const twText = twStaticMap.get(entry.id);
            if (twText !== undefined) {
                entry.zh_tw = { text: twText, source: "official" };
                translatedCount++;
            } else {
                untranslated.push({ category: cat.id, id: entry.id, en: entry.text });
            }
        }
    }

    const targetFile = path.join(dictTwDir, 'static.json');
    require('fs').writeFileSync(targetFile, JSON.stringify({ result: builtStatic }, null, 2), 'utf8');
    console.log(`  ✅ static.json 构建完成: 成功对齐 ${translatedCount} / ${totalCount} 种`);

    return {
        total: totalCount,
        translated: translatedCount,
        missing: totalCount - translatedCount,
        untranslated
    };
}

module.exports = { buildStatic };
