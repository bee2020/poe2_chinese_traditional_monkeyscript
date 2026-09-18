# POE2 官方交易字典最新编译报告 (CHANGELOG)

> 编译时间: 2026/9/18 13:48:52  
> 同步状态: 🟢 官方 API 直连 + 机器 ID 强对齐 + PoE2DB 全链路兜底就绪

---

## 📊 编译结果与覆盖率指标总览

| 业务模块 | 国际服总条目 | 官方台服已对齐 | ⚠️ 待补全/缺漏数 | 🌐 使用 poe2db.tw 兜底查找 (成功 / 未查到) | 🎯 最终综合覆盖率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **通货材料 (static.json)** | **798** | **798** | 🟢 **0 种** | 🟢 无需介入 (100% 官方对齐) | **100.00%** |
| **市集筛选 (filters.json)** | **undefined** | **undefined** | 🟢 **undefined 项** | 🟢 无需介入 (100% 官方对齐) | **100.00%** |
| **装备与暗金 (items.json)** | **3900** | **0** | 🔴 **3900 件** | 🟢 **已查到: 3898 件** / ⚪ 未查到: 0 件 | **99.95%** |
| **核心词缀 (stats.json)** | **8296** | **8199** | 🔴 **97 条** | 🟢 **已查到: 83 条** / ⚪ 未查到: 14 条 | **99.83%** |

---

## 📁 产物输出与引用说明

- **基础字典输出路径**: `dict/tw/`
  - `dict/tw/static.json` (通货材料: 100% 官方对齐)
  - `dict/tw/filters.json` (市集筛选器: 100% 官方对齐)
  - `dict/tw/items.json` (装备与暗金: 100% 综合覆盖)
  - `dict/tw/stats.json` (核心词缀与属性: 99.83% 综合覆盖)

---

## 🔍 未查到的装备明细清单

> 🎉 **全库装备已 100% 全部查找到位，未查到数为 0！**

---

## 🔍 未查到的核心词缀明细清单 (14 条)

| 序号 | 词缀分类 | 官方机器 ID | 英文词缀原文 (EN Text) | 状态 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `explicit` | `explicit.stat_3762412853` | `Attacks with this Weapon Penetrate #% Chaos Resistance` | 无法匹配 |
| 2 | `explicit` | `explicit.stat_4011431182` | `Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward` | 无法匹配 |
| 3 | `explicit` | `explicit.stat_2888350852` | `Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward` | 无法匹配 |
| 4 | `explicit` | `explicit.stat_457920946` | `Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward` | 无法匹配 |
| 5 | `explicit` | `explicit.stat_915546383` | `Gain #% of Physical Damage as Extra Damage of a random Element` | 无法匹配 |
| 6 | `crafted` | `crafted.stat_4011431182` | `Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward` | 无法匹配 |
| 7 | `crafted` | `crafted.stat_2888350852` | `Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward` | 无法匹配 |
| 8 | `crafted` | `crafted.stat_457920946` | `Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward` | 无法匹配 |
| 9 | `rune` | `rune.stat_2203195791` | `#% increased Skill Speed for each Corrupted Item Equipped` | 无法匹配 |
| 10 | `rune` | `rune.stat_138373935` | `#% to Chaos Resistance for each Corrupted Item Equipped` | 无法匹配 |
| 11 | `rune` | `rune.stat_3353733343` | `When you generate a Frenzy Charge, Allies in your Presence generate that Charge instead` | 无法匹配 |
| 12 | `rune` | `rune.stat_1914815166` | `Recover #% of maximum Life over 2 Seconds when you use a Command Skill` | 无法匹配 |
| 13 | `rune` | `rune.stat_3257561708` | `When you generate an Endurance Charge, Allies in your Presence generate that Charge instead` | 无法匹配 |
| 14 | `desecrated` | `desecrated.stat_3762412853` | `Attacks with this Weapon Penetrate #% Chaos Resistance` | 无法匹配 |

---

## 🔄 本次版本实质变动明细 (Diff Changes)

> 📊 **本次构建累计检测到 21 处实质性词条变更**（相较于上一次构建产物）：

### 📦 装备与暗金变动 (items.json)

**🟡 翻译修正与变更 (4 项)**:
- `Glacial Fortress`: `冰川��壘` ➔ **`冰川堡壘`**
- `Nightfall (Glacial Fortress)`: `夜墜 冰川��壘` ➔ **`夜墜 冰川堡壘`**
- `Runeforged Marabout Garb`: `符鍛��士裝束` ➔ **`符鍛修士裝束`**
- `Olroth's Reliquary Key`: `奧爾羅斯的���庫鑰匙` ➔ **`奧爾羅斯的寶庫鑰匙`**

### ⚡ 核心词缀变动 (stats.json)

**🟡 词缀翻译变更 (17 条)**:
- `[explicit] Expeditions contain 1 Vaal Relic in Map`: `Expeditions contain 1 Vaal Relic in Map` ➔ **`地圖中的探險含有1個瓦爾遺物`**
- `[explicit] #% increased Expedition Explosive Area of Effect in Map`: `#% increased Expedition Explosive Area of Effect in Map` ➔ **`增加#%地圖中探險炸藥的範圍效果`**
- `[explicit] You can only Socket Emerald Jewels in this item`: `你只能在這件物品上鑲嵌翡翠珠寶` ➔ **`你只能在這件物品上鑲嵌綠寶石`**
- `[explicit] #% increased Magnitude of Impales inflicted with Spells`: `法術暴擊時，破壞等同於#%造成的物理傷害的護甲` ➔ **`增加#%完全破甲的效果`**
- `[explicit] Debilitate Enemies on Hit while you have an Emerald and a Sapphire socketed in your tree`: `若插槽中的鑲嵌碧綠翠雲和藍寶石，擊中時虛弱敵人` ➔ **`若你的天賦樹中鑲嵌了一顆綠寶石和藍寶石，擊中時虛弱敵人`**
- `[implicit] Has no Accuracy Penalty from Range`: `遠程無命中懲罰` ➔ **`必定擊中`**
- `[fractured] Debilitate Enemies on Hit while you have an Emerald and a Sapphire socketed in your tree`: `若插槽中的鑲嵌碧綠翠雲和藍寶石，擊中時虛弱敵人` ➔ **`若你的天賦樹中鑲嵌了一顆綠寶石和藍寶石，擊中時虛弱敵人`**
- `[crafted] #% increased Magnitude of Impales inflicted with Spells`: `法術暴擊時，破壞等同於#%造成的物理傷害的護甲` ➔ **`增加#%完全破甲的效果`**
- `[crafted] Debilitate Enemies on Hit while you have an Emerald and a Sapphire socketed in your tree`: `若插槽中的鑲嵌碧綠翠雲和藍寶石，擊中時虛弱敵人` ➔ **`若你的天賦樹中鑲嵌了一顆綠寶石和藍寶石，擊中時虛弱敵人`**
- `[rune] #% to Chaos Resistance for each Corrupted Item Equipped`: `每一裝備的���汙染物品#%混沌抗性` ➔ **`(空)`**
- `[rune] Bonded: Knocks Enemies Back on Hit`: `擊中時會擊退敵人` ➔ **`幻化武器`**
- `[rune] Bonded: #% increased Armour while Shapeshifted`: `當你變形時，#%的護甲同時套用至元素傷害` ➔ **`你變形期間，增加#%暈眩門檻`**
- `[rune] #% of Armour also applies to Chaos Damage while on full Energy Shield`: `你的召喚物重塑時，你便會開始能量護盾充能` ➔ **`獲得等同於所裝備護甲物品總力量需求#%的最大能量護盾`**
- `[rune] #% increased Skill Speed for each Corrupted Item Equipped`: `每裝備一件已汙染物品，即增加#%技能速度` ➔ **`(空)`**
- `[rune] #% increased Runic Ward Regeneration Rate while Sprinting`: `衝刺時增加#%符文保護回復率` ➔ **`增加#%符文保護效用`**
- `[rune] # to maximum Mana per 3 Item Armour on Equipped Helmet`: `裝備的頭盔每有#物品護甲即#最大魔力` ➔ **`裝備的頭盔上每有#點護甲，#最大生命`**
- `[desecrated] #% increased Magnitude of Impales inflicted with Spells`: `法術暴擊時，破壞等同於#%造成的物理傷害的護甲` ➔ **`增加#%完全破甲的效果`**

### 🪙 通货材料变动 (static.json)
> 🟢 无变动

