/**
 * 【步骤一：双源官方数据采集】
 * 1. 从 GGG 国际服官方 API 拉取 4 大英文原件 -> 保存至 raw/raw_en/
 * 2. 从 GGG 台服官方 API 拉取 4 大繁中原件 -> 保存至 raw/raw_tw/
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const RAW_EN_DIR = path.resolve(__dirname, '../raw/raw_en');
const RAW_TW_DIR = path.resolve(__dirname, '../raw/raw_tw');

const APIS = [
    { name: 'items', endpoint: '/api/trade2/data/items' },
    { name: 'stats', endpoint: '/api/trade2/data/stats' },
    { name: 'static', endpoint: '/api/trade2/data/static' },
    { name: 'filters', endpoint: '/api/trade2/data/filters' }
];

function fetchEndpoint(host, endpoint) {
    return new Promise((resolve, reject) => {
        const url = `https://${host}${endpoint}`;
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 20000
        }, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`JSON 解析失败: ${e.message}`));
                }
            });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error(`超时: ${url}`)); });
        req.on('error', reject);
    });
}

async function fetchAllRaw() {
    console.log('================================================================');
    console.log('🚀【第 1 步：从 GGG 官方双端 API 实时拉取最新 4 大英文与繁中原版】');
    console.log('================================================================');

    [RAW_EN_DIR, RAW_TW_DIR].forEach(d => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const results = { en: {}, tw: {} };

    // 1. 抓取国际服官方英文
    console.log('\n🌐 正在抓取国际服官方英文数据 (pathofexile.com)...');
    for (const api of APIS) {
        const targetPath = path.join(RAW_EN_DIR, `${api.name}.json`);
        try {
            const json = await fetchEndpoint('www.pathofexile.com', api.endpoint);
            fs.writeFileSync(targetPath, JSON.stringify(json, null, 2), 'utf8');
            results.en[api.name] = json.result || json;
            console.log(`  ✅ [EN] ${api.name}.json 抓取成功`);
        } catch (err) {
            console.warn(`  ⚠️ [EN] ${api.name} 在线抓取受限: ${err.message}，尝试使用现有本地文件...`);
            if (fs.existsSync(targetPath)) {
                results.en[api.name] = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                console.log(`  📦 [EN] ${api.name}.json 已载入本地缓存`);
            } else {
                throw err;
            }
        }
    }

    // 2. 抓取台服官方繁中
    console.log('\n🇹🇼 正在抓取台服官方繁中数据 (pathofexile.tw)...');
    for (const api of APIS) {
        const targetPath = path.join(RAW_TW_DIR, `${api.name}.json`);
        try {
            const json = await fetchEndpoint('pathofexile.tw', api.endpoint);
            fs.writeFileSync(targetPath, JSON.stringify(json, null, 2), 'utf8');
            results.tw[api.name] = json.result || json;
            console.log(`  ✅ [TW] ${api.name}.json 抓取成功`);
        } catch (err) {
            console.warn(`  ⚠️ [TW] ${api.name} 在线抓取受限: ${err.message}，尝试使用现有本地文件...`);
            if (fs.existsSync(targetPath)) {
                results.tw[api.name] = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                console.log(`  📦 [TW] ${api.name}.json 已载入本地缓存`);
            } else {
                throw err;
            }
        }
    }

    console.log('\n================================================================');
    console.log('🎉 官方 4 大原始 JSON 全部就绪！');
    console.log(`  - 英文原件: raw/raw_en/ [items.json, stats.json, static.json, filters.json]`);
    console.log(`  - 繁中原件: raw/raw_tw/ [items.json, stats.json, static.json, filters.json]`);
    console.log('================================================================\n');

    return results;
}

if (require.main === module) {
    fetchAllRaw().catch(err => {
        console.error('抓取失败:', err);
        process.exit(1);
    });
}

module.exports = { fetchAllRaw };
