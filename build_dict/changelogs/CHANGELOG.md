# POE2 官方交易字典最新编译报告 (CHANGELOG)

> 编译时间: 9/5/2026, 1:52:08 AM  
> 同步状态: 🟢 官方 API 直连 + 机器 ID 强对齐 + PoE2DB 全链路兜底就绪

---

## 📊 编译结果与覆盖率指标总览

| 业务模块 | 国际服总条目 | 官方台服已对齐 | ⚠️ 待补全/缺漏数 | 🌐 使用 poe2db.tw 兜底查找 (成功 / 未查到) | 🎯 最终综合覆盖率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **通货材料 (static.json)** | **798** | **798** | 🟢 **0 种** | 🟢 无需介入 (100% 官方对齐) | **100.00%** |
| **市集筛选 (filters.json)** | **undefined** | **undefined** | 🟢 **undefined 项** | 🟢 无需介入 (100% 官方对齐) | **100.00%** |
| **装备与暗金 (items.json)** | **3889** | **3455** | 🔴 **434 件** | 🟢 **已查到: 434 件** / ⚪ 未查到: 0 件 | **100.00%** |
| **核心词缀 (stats.json)** | **8267** | **8173** | 🔴 **94 条** | 🟢 **已查到: 81 条** / ⚪ 未查到: 13 条 | **99.84%** |

---

## 📁 产物输出与引用说明

- **基础字典输出路径**: `dict/tw/`
  - `dict/tw/static.json` (通货材料: 100% 官方对齐)
  - `dict/tw/filters.json` (市集筛选器: 100% 官方对齐)
  - `dict/tw/items.json` (装备与暗金: 100% 综合覆盖)
  - `dict/tw/stats.json` (核心词缀与属性: 99.84% 综合覆盖)

---

## 🔍 未查到的装备明细清单

> 🎉 **全库装备已 100% 全部查找到位，未查到数为 0！**

---

## 🔍 未查到的核心词缀明细清单 (13 条)

| 序号 | 词缀分类 | 官方机器 ID | 英文词缀原文 (EN Text) | 状态 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `explicit` | `explicit.stat_3762412853` | `Attacks with this Weapon Penetrate #% Chaos Resistance` | 无法匹配 |
| 2 | `explicit` | `explicit.stat_4011431182` | `Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward` | 无法匹配 |
| 3 | `explicit` | `explicit.stat_3937291366` | `#% chance to add a Vaal Beacon Unique Monster to the Map` | 无法匹配 |
| 4 | `explicit` | `explicit.stat_2888350852` | `Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward` | 无法匹配 |
| 5 | `explicit` | `explicit.stat_915546383` | `Gain #% of Physical Damage as Extra Damage of a random Element` | 无法匹配 |
| 6 | `explicit` | `explicit.stat_457920946` | `Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward` | 无法匹配 |
| 7 | `crafted` | `crafted.stat_4011431182` | `Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward` | 无法匹配 |
| 8 | `crafted` | `crafted.stat_2888350852` | `Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward` | 无法匹配 |
| 9 | `crafted` | `crafted.stat_457920946` | `Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward` | 无法匹配 |
| 10 | `rune` | `rune.stat_1914815166` | `Recover #% of maximum Life over 2 Seconds when you use a Command Skill` | 无法匹配 |
| 11 | `rune` | `rune.stat_3353733343` | `When you generate a Frenzy Charge, Allies in your Presence generate that Charge instead` | 无法匹配 |
| 12 | `rune` | `rune.stat_3257561708` | `When you generate an Endurance Charge, Allies in your Presence generate that Charge instead` | 无法匹配 |
| 13 | `desecrated` | `desecrated.stat_3762412853` | `Attacks with this Weapon Penetrate #% Chaos Resistance` | 无法匹配 |
