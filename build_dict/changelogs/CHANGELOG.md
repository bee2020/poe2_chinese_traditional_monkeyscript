# POE2 官方交易字典最新编译报告 (CHANGELOG)

> 编译时间: 9/6/2026, 3:37:43 AM  
> 同步状态: 🟢 官方 API 直连 + 机器 ID 强对齐 + PoE2DB 全链路兜底就绪

---

## 📊 编译结果与覆盖率指标总览

| 业务模块 | 国际服总条目 | 官方台服已对齐 | ⚠️ 待补全/缺漏数 | 🌐 使用 poe2db.tw 兜底查找 (成功 / 未查到) | 🎯 最终综合覆盖率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **通货材料 (static.json)** | **798** | **798** | 🟢 **0 种** | 🟢 无需介入 (100% 官方对齐) | **100.00%** |
| **市集筛选 (filters.json)** | **undefined** | **undefined** | 🟢 **undefined 项** | 🟢 无需介入 (100% 官方对齐) | **100.00%** |
| **装备与暗金 (items.json)** | **3900** | **3525** | 🔴 **375 件** | 🟢 **已查到: 375 件** / ⚪ 未查到: 0 件 | **100.00%** |
| **核心词缀 (stats.json)** | **8289** | **8176** | 🔴 **113 条** | 🟢 **已查到: 92 条** / ⚪ 未查到: 21 条 | **99.75%** |

---

## 📁 产物输出与引用说明

- **基础字典输出路径**: `dict/tw/`
  - `dict/tw/static.json` (通货材料: 100% 官方对齐)
  - `dict/tw/filters.json` (市集筛选器: 100% 官方对齐)
  - `dict/tw/items.json` (装备与暗金: 100% 综合覆盖)
  - `dict/tw/stats.json` (核心词缀与属性: 99.75% 综合覆盖)

---

## 🔍 未查到的装备明细清单

> 🎉 **全库装备已 100% 全部查找到位，未查到数为 0！**

---

## 🔍 未查到的核心词缀明细清单 (21 条)

| 序号 | 词缀分类 | 官方机器 ID | 英文词缀原文 (EN Text) | 状态 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `explicit` | `explicit.stat_3762412853` | `Attacks with this Weapon Penetrate #% Chaos Resistance` | 无法匹配 |
| 2 | `explicit` | `explicit.stat_2852112245` | `Expeditions contain 1 Vaal Relic in Map` | 无法匹配 |
| 3 | `explicit` | `explicit.stat_2905096233` | `#% increased Expedition Monster Rarity in Map` | 无法匹配 |
| 4 | `explicit` | `explicit.stat_4011431182` | `Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward` | 无法匹配 |
| 5 | `explicit` | `explicit.stat_1109460697` | `Expeditions contain 1 Additional Verisium Sentry in Map` | 无法匹配 |
| 6 | `explicit` | `explicit.stat_181823691` | `Expeditions contain 1 buried Strongbox in Map` | 无法匹配 |
| 7 | `explicit` | `explicit.stat_2888350852` | `Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward` | 无法匹配 |
| 8 | `explicit` | `explicit.stat_1183698646` | `Expeditions contain 1 Additional Boss encased in ice in Map` | 无法匹配 |
| 9 | `explicit` | `explicit.stat_3871299443` | `Verisium Remnants have +#% chance to add an additional Runic Modifier in Map` | 无法匹配 |
| 10 | `explicit` | `explicit.stat_3653794255` | `Expeditions have +#% Surpassing chance to contain an additional Verisium Remnant` | 无法匹配 |
| 11 | `explicit` | `explicit.stat_779964546` | `Expeditions have +#% Surpassing chance to Duplicate Runic Monsters in Map` | 无法匹配 |
| 12 | `explicit` | `explicit.stat_3963944561` | `The first unearthed Runic Monster will be a Rare Monster in Map` | 无法匹配 |
| 13 | `explicit` | `explicit.stat_915546383` | `Gain #% of Physical Damage as Extra Damage of a random Element` | 无法匹配 |
| 14 | `explicit` | `explicit.stat_457920946` | `Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward` | 无法匹配 |
| 15 | `crafted` | `crafted.stat_4011431182` | `Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward` | 无法匹配 |
| 16 | `crafted` | `crafted.stat_2888350852` | `Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward` | 无法匹配 |
| 17 | `crafted` | `crafted.stat_457920946` | `Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward` | 无法匹配 |
| 18 | `rune` | `rune.stat_3353733343` | `When you generate a Frenzy Charge, Allies in your Presence generate that Charge instead` | 无法匹配 |
| 19 | `rune` | `rune.stat_3257561708` | `When you generate an Endurance Charge, Allies in your Presence generate that Charge instead` | 无法匹配 |
| 20 | `rune` | `rune.stat_1914815166` | `Recover #% of maximum Life over 2 Seconds when you use a Command Skill` | 无法匹配 |
| 21 | `desecrated` | `desecrated.stat_3762412853` | `Attacks with this Weapon Penetrate #% Chaos Resistance` | 无法匹配 |
