/**
 * 【PoEDB 底层直连客户端与通用算法模块 (poe2db_client.cjs)】
 * 职责：提供纯动态 HTTP GET、toSign 算法、页面 mod 解析器以及 CDN 字典 Hash 嗅探
 */
const https = require('https');

function httpGet(url, options = {}) {
    return new Promise((resolve) => {
        const timeoutMs = options.timeout || 25000;
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://poe2db.tw/',
                'Accept': 'application/json, text/html, */*; q=0.9',
                ...options.headers
            },
            timeout: timeoutMs
        }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = res.headers.location.startsWith('http') 
                    ? res.headers.location 
                    : `https://poe2db.tw${res.headers.location}`;
                return resolve(httpGet(nextUrl, options));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', err => resolve({ statusCode: 500, error: err }));
        req.on('timeout', () => { req.destroy(); resolve({ statusCode: 408 }); });
    });
}

const { cleanAndToSign } = require('../utils/clean_util.cjs');

/**
 * 结构化机器指纹解析器 (以 Code + ModFamily + Generation + Level 建立 100% 精确指纹)
 */
function parseModChunks(html) {
    if (!html) return [];
    const list = [];
    // 匹配包含 "str" 的每一个独立 Mod 对象块 (无论以 type、Name、Code 还是 ID 开头)
    const chunkRegex = /\{(?:"type"|"Name"|"Code"|"ModTypeID"|"ID"):[\s\S]*?\}(?=,\{"type"|,\{"Name"|,\{"Code"|,\{"ModTypeID"|,\{"ID"|\]\s*[\)\};])/g;
    let m;
    while ((m = chunkRegex.exec(html)) !== null) {
        const chunk = m[0];
        const strM = chunk.match(/"str"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (!strM) continue;
        const str = cleanAndToSign(strM[1], true);
        if (!str) continue;

        const codeM = chunk.match(/"Code"\s*:\s*"([^"]+)"/);
        const familyM = chunk.match(/"ModFamilyList"\s*:\s*\[([^\]]*)\]/);
        const genM = chunk.match(/"ModGenerationTypeID"\s*:\s*"([^"]+)"/);
        const levelM = chunk.match(/"Level"\s*:\s*"([^"]+)"/);

        const code = codeM ? codeM[1] : null;
        const family = familyM ? familyM[1].replace(/"/g, '').trim() : null;
        const gen = genM ? genM[1] : '';
        const level = levelM ? levelM[1] : '';

        // 生成指纹集合
        const fingerprints = [];
        if (code) fingerprints.push(`code_${code}`);
        if (family) fingerprints.push(`fam_${family}_${gen}_${level}`);

        list.push({ fingerprints, str });
    }
    return list;
}

let cachedAutocompleteJson = null;

async function fetchLatestAutocompleteJson() {
    if (cachedAutocompleteJson) return cachedAutocompleteJson;

    console.log(`  🔍 正在动态探测 PoEDB 首页以嗅探最新的 CDN 字典哈希...`);
    const homeRes = await httpGet('https://poe2db.tw/tw/');
    if (homeRes.statusCode !== 200) return null;

    const headerMatch = homeRes.body.match(/src="([^"]*poedb_header\.[a-zA-Z0-9]+\.js)"/);
    if (!headerMatch) return null;

    const headerUrl = headerMatch[1].startsWith('http') ? headerMatch[1] : `https://poe2db.tw${headerMatch[1]}`;
    const headerJsRes = await httpGet(headerUrl);
    if (headerJsRes.statusCode !== 200) return null;

    const hashMatch = headerJsRes.body.match(/'autocompletecb_tw\.json':\s*'([^']+)'/);
    if (!hashMatch) return null;

    const fullCdnUrl = `https://cdn.poe2db.tw/json/${hashMatch[1]}`;
    console.log(`  🎯 成功动态锁定官方最新字典文件: ${hashMatch[1]}`);

    const cdnRes = await httpGet(fullCdnUrl);
    if (cdnRes.statusCode === 200) {
        try {
            cachedAutocompleteJson = JSON.parse(cdnRes.body);
            return cachedAutocompleteJson;
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * 原生轻量并发调度器，严格限制同时在飞的请求数 (Concurrency Limit)
 * @param {Array} items 待处理项
 * @param {number} limit 最大并发数 (默认 3)
 * @param {Function} asyncFn 异步执行逻辑
 */
async function mapConcurrent(items, limit = 3, asyncFn) {
    if (!items || items.length === 0) return [];
    const results = [];
    const executing = new Set();
    for (const item of items) {
        const p = Promise.resolve().then(() => asyncFn(item));
        results.push(p);
        executing.add(p);
        const clean = () => executing.delete(p);
        p.then(clean).catch(clean);
        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

module.exports = { httpGet, cleanAndToSign, parseModChunks, fetchLatestAutocompleteJson, mapConcurrent };
