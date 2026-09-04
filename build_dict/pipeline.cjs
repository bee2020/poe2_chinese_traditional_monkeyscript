/**
 * POE2 官方双源拉取与繁中字典全自动化流水线 (总控入口)
 * 执行命令: node pipeline.cjs
 */
const { fetchAllRaw } = require('./scripts/fetch.cjs');
const { buildTwDictionaries } = require('./scripts/build.cjs');
const { generateDiffAndChangelog } = require('./scripts/diff.cjs');

async function runPipeline() {
    console.log('================================================================');
    console.log('🚀 POE2 官方交易字典全自动双源同步 + PoE2DB 兜底流水线');
    console.log('   100% 官方 API 直连 · PoE2DB 动态兜底补全 · 真实指标追踪');
    console.log('================================================================\n');

    const startTime = Date.now();

    try {
        // 第 1 步：从官方国际服与台服抓取 4 大原始 JSON
        await fetchAllRaw();

        // 第 2 步：构建 dict/tw/ 并对缺失项向 PoE2DB 发起真实查找补全
        const untranslatedReport = await buildTwDictionaries();

        // 第 3 步：生成包含 PoE2DB 查找成功/未查到列的真实报告
        generateDiffAndChangelog(untranslatedReport);

        const costSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✨ 全部流水线执行完毕！耗时: ${costSec} 秒`);
        console.log('📁 产物目录速览:');
        console.log('  - 官方原件: raw/raw_en/ & raw/raw_tw/');
        console.log('  - 最终字典: dict/tw/ [items.json, stats.json, static.json, filters.json]');
        console.log('  - 变动日志: changelogs/CHANGELOG.md\n');
    } catch (err) {
        console.error('❌ 流水线执行失败:', err);
        process.exit(1);
    }
}

runPipeline();
