/**
 * 【构建总调度器】
 * 业务彻底解耦分立，按模块依次执行独立的解析构建器：
 * 1. buildStatic  (static.json)
 * 2. buildFilters (filters.json)
 * 3. buildStats   (stats.json) - 含官方 ID 强对撞 + PoE2DB 兜底
 * 4. buildItems   (items.json) - 含双源同位自解析 + PoE2DB 兜底
 */
const fs = require('fs');
const path = require('path');
const { summarizeEntries } = require('./utils/report_util.cjs');

const { buildStatic } = require('./builders/build_static.cjs');
const { buildFilters } = require('./builders/build_filters.cjs');
const { buildStats } = require('./builders/build_stats.cjs');
const { buildItems } = require('./builders/build_items.cjs');
const { buildPassives } = require('./builders/build_passives.cjs');

const RAW_EN_DIR = path.resolve(__dirname, '../raw/raw_en');
const RAW_TW_DIR = path.resolve(__dirname, '../raw/raw_tw');
const DICT_TW_DIR = path.resolve(__dirname, '../dict/tw');

async function buildTwDictionaries() {
    console.log('================================================================');
    console.log('🔧【第 2 步：触发 4 大分立业务模块独立构建】');
    console.log('================================================================\n');

    if (!fs.existsSync(DICT_TW_DIR)) {
        fs.mkdirSync(DICT_TW_DIR, { recursive: true });
    }

    // 业务 1: 通货与材料 (static)
    const staticReport = buildStatic(RAW_EN_DIR, RAW_TW_DIR, DICT_TW_DIR);

    // 业务 2: 市集筛选器 (filters)
    const filtersReport = buildFilters(RAW_EN_DIR, RAW_TW_DIR, DICT_TW_DIR);

    // 业务 3: 核心词缀与属性 (stats - 含官方对齐 + PoE2DB 兜底)
    const statsReport = await buildStats(RAW_EN_DIR, RAW_TW_DIR, DICT_TW_DIR);

    // 业务 4: 装备基底与暗金 (items - 含双源对齐 + PoE2DB 兜底)
    const itemsReport = await buildItems(RAW_EN_DIR, RAW_TW_DIR, DICT_TW_DIR);
    const passivesReport = await buildPassives(DICT_TW_DIR);

    return {
        generatedAt: new Date().toISOString(),
        summary: {
            items: itemsReport,
            passives: passivesReport,
            stats: statsReport,
            static: summarizeEntries(JSON.parse(fs.readFileSync(path.join(DICT_TW_DIR, 'static.json'), 'utf8'))),
            filters: filtersReport
        },
        items: itemsReport.untranslated,
        stats: statsReport.untranslated,
        static: staticReport.untranslated,
        filters: filtersReport.untranslated
    };
}

module.exports = { buildTwDictionaries };
