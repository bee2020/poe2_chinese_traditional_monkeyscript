const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '../build_dict/dict/tw');
const TARGET_DIR = path.resolve(__dirname, '../src/dict');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

console.log('[Sync-Dict] 开始从 poe2_chinese-traditional_dict 同步核心数据字典...');

// 1. 同步 4 大核心权威 JSON
const CORE_FILES = ['items.json', 'stats.json', 'static.json', 'filters.json'];

CORE_FILES.forEach(file => {
  const src = path.join(SOURCE_DIR, file);
  const dest = path.join(TARGET_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    console.log(`  ✓ 已同步 ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`  ✗ 找不到源文件: ${src}`);
    process.exit(1);
  }
});


// 3. 繁体基础属性与装备需求 props.json (官方繁中用语规范)
const TW_PROPS = {
  "Requires": "需求",
  "Level": "等級",
  "Int": "智慧",
  "Str": "力量",
  "Dex": "敏捷",
  "Item Level": "物品等級",
  "Reload Time": "填裝時間",
  "Critical Hit Chance": "暴擊率",
  "Critical Strike Chance": "暴擊率",
  "Evasion Rating": "閃避值",
  "Armour": "護甲",
  "Quality": "品質",
  "Sockets": "插槽",
  "Attacks per Second": "每秒攻擊次數",
  "Weapon Range": "武器範圍",
  "Spirit": "精魂",
  "Block chance": "格擋率",
  "Physical Damage": "物理傷害",
  "Elemental Damage": "元素傷害",
  "Chaos Damage": "混沌傷害",
  "Total DPS": "總 DPS",
  "Mana Multiplier": "魔力消耗倍率",
  "Mana Cost": "魔力消耗",
  "Cast Time": "施放時間",
  "Mana Reserved": "魔力保留",
  "Cooldown Time": "冷卻時間",
  "Effectiveness of Added Damage": "傷害效用",
  "Limited to": "僅限",
  "Radius: Large": "範圍: 大",
  "Radius: Medium": "範圍: 中",
  "Radius: Small": "範圍: 小",
  "Energy Shield": "能量護盾",
  "Elemental": "元素",
  "Life": "生命",
  "Defence": "防禦",
  "Fire": "火焰",
  "Lightning": "閃電",
  "Attack": "攻擊",
  "Speed": "速度",
  "Mana": "魔力",
  "Physical": "物理",
  "Cold": "冰冷",
  "Chaos": "混沌",
  "Caster": "施法",
  "Attribute": "屬性",
  "Modifiers": "詞綴"
};

fs.writeFileSync(
  path.join(TARGET_DIR, 'props.json'),
  JSON.stringify(TW_PROPS, null, 2),
  'utf-8'
);
console.log('  ✓ 已生成官方繁中屬性需求字典 props.json');

// 如果历史残留 weights.json，自动清理
const weightsPath = path.join(TARGET_DIR, 'weights.json');
if (fs.existsSync(weightsPath)) {
  fs.unlinkSync(weightsPath);
  console.log('  ✓ 已清理废除的 weights.json (已升级为动态规则驱动)');
}

console.log('[Sync-Dict] 字典同步与初始化完成！');
