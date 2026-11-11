# POE2 官方交易字典最新编译报告 (CHANGELOG)

> 🕒 报告时间（北京时间）：2026/11/11 13:19:07

---

## 📊 编译结果与覆盖率指标总览

| 业务模块 | 有效总条目 | 官方台服完整对齐 | ⚠️ 待补全/保留原文 | 🌐 其他来源补全（完整 / 部分） | 🎯 字段完整率 |
| :--- | ---: | ---: | ---: | :--- | ---: |
| **🪙 通货材料** (static.json) | **786** | 786 | 🟢 0 项 | 🟢 无需补全 | **100.00%** |
| **🔎 市集筛选** (filters.json) | **203** | 203 | 🟢 0 项 | 🟢 无需补全 | **100.00%** |
| **📦 装备与暗金** (items.json) | **3898** | 0 | 🟡 3 项 | 完整 3895 / 部分 2 | **99.92%** |
| **⚡ 核心词缀** (stats.json) | **8315** | 8229 | 🟡 33 项 | 完整 53 / 部分 0 | **99.60%** |

> 已排除占位项及无可见文本项；物品按名称和基底共同统计。完整率反映字段齐备程度，不代表全部译文已验证。

---

## 📁 产物输出与引用说明

- **基础字典输出路径**：`dict/tw/`
  - `dict/tw/static.json`（通货材料：100.00% 字段完整率）
  - `dict/tw/filters.json`（市集筛选：100.00% 字段完整率）
  - `dict/tw/items.json`（装备与暗金：99.92% 字段完整率）
  - `dict/tw/stats.json`（核心词缀：99.60% 字段完整率）

---

## 🔍 待补全的装备明细清单 (3 项)

| 序号 | 分类 | 英文物品 | 待补全字段 | 状态 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | <code>armour</code> | <code>Forbidden Gaze Chain Tiara</code> | 名称 | 部分翻译 |
| 2 | <code>currency</code> | <code>Aldur's Legacy</code> | 基底 | 缺失或保留原文 |
| 3 | <code>weapon</code> | <code>Guiding Palm Shrine Sceptre (Legacy)</code> | 名称 | 部分翻译 |

---

## 🔍 待核对的核心词缀明细清单 (33 条)

| 序号 | 词缀分类 | 机器 ID | 英文词缀原文 | 状态 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | <code>explicit</code> | <code>explicit.stat_1138742368</code> | <code>Increases and Reductions to Light Radius also apply to Area of Effect at #% of their value</code> | 缺失或保留原文 |
| 2 | <code>explicit</code> | <code>explicit.stat_1400313697</code> | <code>Increases and Reductions to  Cold and Lightning Damage in Radius are transformed to apply to Fire Damage</code> | 缺失或保留原文 |
| 3 | <code>explicit</code> | <code>explicit.stat_1687542781</code> | <code>Notable Passive Skills in Radius also grant #% to Lightning Resistance</code> | 缺失或保留原文 |
| 4 | <code>explicit</code> | <code>explicit.stat_2103621252</code> | <code>Eat a Soul when you Hit a Unique Enemy, no more than once every second</code> | 缺失或保留原文 |
| 5 | <code>explicit</code> | <code>explicit.stat_2888350852</code> | <code>Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward</code> | 缺失或保留原文 |
| 6 | <code>explicit</code> | <code>explicit.stat_3368921525</code> | <code>Increases and Reductions to  Fire and Lightning Damage in Radius are transformed to apply to Cold Damage</code> | 缺失或保留原文 |
| 7 | <code>explicit</code> | <code>explicit.stat_3762412853</code> | <code>Attacks with this Weapon Penetrate #% Chaos Resistance</code> | 缺失或保留原文 |
| 8 | <code>explicit</code> | <code>explicit.stat_3946450303</code> | <code>Notable Passive Skills in Radius also grant #% to Cold Resistance</code> | 缺失或保留原文 |
| 9 | <code>explicit</code> | <code>explicit.stat_4011431182</code> | <code>Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward</code> | 缺失或保留原文 |
| 10 | <code>explicit</code> | <code>explicit.stat_457920946</code> | <code>Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward</code> | 缺失或保留原文 |
| 11 | <code>explicit</code> | <code>explicit.stat_679019978</code> | <code>#% of Damage is taken from Mana before Life while not on Low Mana</code> | 缺失或保留原文 |
| 12 | <code>explicit</code> | <code>explicit.stat_895564377</code> | <code>Increases and Reductions to  Cold and Fire Damage in Radius are transformed to apply to Lightning Damage</code> | 缺失或保留原文 |
| 13 | <code>explicit</code> | <code>explicit.stat_915546383</code> | <code>Gain #% of Physical Damage as Extra Damage of a random Element</code> | 缺失或保留原文 |
| 14 | <code>implicit</code> | <code>implicit.stat_3691641145</code> | <code>#% increased Damage taken</code> | 缺失或保留原文 |
| 15 | <code>fractured</code> | <code>fractured.stat_3368921525</code> | <code>Increases and Reductions to  Fire and Lightning Damage in Radius are transformed to apply to Cold Damage</code> | 缺失或保留原文 |
| 16 | <code>fractured</code> | <code>fractured.stat_3946450303</code> | <code>Notable Passive Skills in Radius also grant #% to Cold Resistance</code> | 缺失或保留原文 |
| 17 | <code>crafted</code> | <code>crafted.stat_1400313697</code> | <code>Increases and Reductions to  Cold and Lightning Damage in Radius are transformed to apply to Fire Damage</code> | 缺失或保留原文 |
| 18 | <code>crafted</code> | <code>crafted.stat_1687542781</code> | <code>Notable Passive Skills in Radius also grant #% to Lightning Resistance</code> | 缺失或保留原文 |
| 19 | <code>crafted</code> | <code>crafted.stat_2888350852</code> | <code>Gain #% of Damage as Extra Cold Damage while you are missing Runic Ward</code> | 缺失或保留原文 |
| 20 | <code>crafted</code> | <code>crafted.stat_3368921525</code> | <code>Increases and Reductions to  Fire and Lightning Damage in Radius are transformed to apply to Cold Damage</code> | 缺失或保留原文 |
| 21 | <code>crafted</code> | <code>crafted.stat_3946450303</code> | <code>Notable Passive Skills in Radius also grant #% to Cold Resistance</code> | 缺失或保留原文 |
| 22 | <code>crafted</code> | <code>crafted.stat_4011431182</code> | <code>Gain #% of Damage as Extra Chaos Damage while you are missing Runic Ward</code> | 缺失或保留原文 |
| 23 | <code>crafted</code> | <code>crafted.stat_457920946</code> | <code>Gain #% of Damage as Extra Lightning Damage while you are missing Runic Ward</code> | 缺失或保留原文 |
| 24 | <code>crafted</code> | <code>crafted.stat_895564377</code> | <code>Increases and Reductions to  Cold and Fire Damage in Radius are transformed to apply to Lightning Damage</code> | 缺失或保留原文 |
| 25 | <code>rune</code> | <code>rune.stat_1062190843</code> | <code># to Level of all Storm Skill Gems</code> | 缺失或保留原文 |
| 26 | <code>rune</code> | <code>rune.stat_1078570138</code> | <code># to Level of all Hazard Skill Gems</code> | 缺失或保留原文 |
| 27 | <code>rune</code> | <code>rune.stat_1839315243</code> | <code># to Level of all Slam Skill Gems</code> | 缺失或保留原文 |
| 28 | <code>rune</code> | <code>rune.stat_1914815166</code> | <code>Recover #% of maximum Life over 2 Seconds when you use a Command Skill</code> | 缺失或保留原文 |
| 29 | <code>rune</code> | <code>rune.stat_2621116283</code> | <code>Gain #% of damage as Fire damage per 2% Chance to Block</code> | 缺失或保留原文 |
| 30 | <code>rune</code> | <code>rune.stat_2849118560</code> | <code>Bonded: #% reduced Damage taken from Projectile Hits</code> | 缺失或保留原文 |
| 31 | <code>rune</code> | <code>rune.stat_3257561708</code> | <code>When you generate an Endurance Charge, Allies in your Presence generate that Charge instead</code> | 缺失或保留原文 |
| 32 | <code>rune</code> | <code>rune.stat_3353733343</code> | <code>When you generate a Frenzy Charge, Allies in your Presence generate that Charge instead</code> | 缺失或保留原文 |
| 33 | <code>desecrated</code> | <code>desecrated.stat_3762412853</code> | <code>Attacks with this Weapon Penetrate #% Chaos Resistance</code> | 缺失或保留原文 |

---

## 🔄 本次版本实质变动明细 (Diff Changes)

### 📦 装备与暗金变动 (items.json)

> 🟢 无内容变动

### ⚡ 核心词缀变动 (stats.json)

**🟢 新增 (1 项)**

- <code>[fractured] Allocates Guts</code> ➜ <code>配置膽量</code>

### 🪙 通货材料变动 (static.json)

> 🟢 无内容变动

### 🔎 市集筛选变动 (filters.json)

> 🟢 无内容变动

[完整差异数据](CHANGELOG.diff.json)
