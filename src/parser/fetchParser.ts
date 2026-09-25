import { translateItemText } from './itemsParser';
import { dynamicAllocatesMap } from './statsParser';
import { trans4twProps } from '../core/propsTranslator';

const fieldsToTranslate = ['baseType', 'name', 'typeLine'];

// 🛡️ 辅助函数：提取归一化英文文本模式（抹平符号、换行、中文包装与富文本标签差异）
function extractNormalizedPattern(text: string): string {
    if (!text) return '';
    const pureEn = text.match(/\(([^()]+)\)$/)?.[1] || text;
    return pureEn
        .replace(/\[[^|\]]*\||[\][]/g, '')     // 清洗官方标签 [Cold|Cold Damage] -> Cold Damage
        .toLowerCase()
        .replace(/[+-]?(\d*\.\d+|\d+)/g, '#') // 数值归一为 #
        .replace(/[+-]#/g, '#')               // 消除 +# 与 # 的正负号差异
        .replace(/\s+/g, ' ')                 // 多余空格和换行归一
        .trim();
}

import rawTwStats from '../dict/stats.json';
// 🌟 纯动态词缀模式映射表，用于支持珠宝天赋详细说明的秒级对齐
const statsPatternMap = new Map<string, string>();
if (rawTwStats && Array.isArray((rawTwStats as any).result)) {
    for (const group of (rawTwStats as any).result) {
        if (!Array.isArray(group.entries)) continue;
        for (const entry of group.entries) {
            if (entry.text && entry.zh_tw?.text) {
                const pat = extractNormalizedPattern(entry.text);
                if (pat && !statsPatternMap.has(pat)) {
                    statsPatternMap.set(pat, entry.zh_tw.text);
                }
            }
        }
    }
}

/**
 * 🌟 物品搜索结果详情解析与卡片改写 (/api/trade2/fetch)
 * 采用 100% 纯动态内存映射：
 * 1. 装备暗金/基底翻译由 items.json 动态驱动 (已彻底废除 3000 行手写 typeTransMap.json)
 * 2. 涂油天赋由 stats.json 附魔节点纯动态提取 875 条 (已彻底废除 603 行手写 allocates.json)
 */
export function parseFetchResults(response: any, dataMap: any, whisperMap: Record<string, string>): any {
    try {
        if (!response.result || !Array.isArray(response.result)) return response;

        response.result.forEach((item: any) => {
            if (item.listing) {
                whisperMap[item.listing.whisper_token] = item.listing.whisper;
            }

            if (!item.item) return;

            // 1. 纯动态翻译暗金名称与基底
            const rawBaseType = item.item.baseType;
            fieldsToTranslate.forEach(field => {
                if (item.item[field]) {
                    const translated = translateItemText(item.item[field]);
                    if (translated && translated !== item.item[field]) {
                        item.item[field] = translated;
                    }
                }
            });

            // 针对 Rare/Magic 黄装随机命名：若 name 未被直接翻译但基底存在繁中，替换其中包含的基底英文
            if (rawBaseType && item.item.name) {
                const twBase = translateItemText(rawBaseType);
                if (twBase && twBase !== rawBaseType) {
                    if (item.item.name.includes(rawBaseType)) {
                        item.item.name = item.item.name.replace(new RegExp(rawBaseType, 'g'), twBase);
                    }
                    if (item.item.typeLine && item.item.typeLine.includes(rawBaseType)) {
                        item.item.typeLine = item.item.typeLine.replace(new RegExp(rawBaseType, 'g'), twBase);
                    }
                }
            }

            // 2. 词缀属性多维度翻译与数值填充
            if (dataMap['stats'] && dataMap['stats'].length && item.item.extended && item.item.extended.hashes) {
                const keys = Object.keys(item.item.extended.hashes);
                keys.forEach(key => {
                    const mods = item.item.extended.hashes[key];
                    const entry = dataMap['stats'].find((a: any) => a.id === key);
                    const modTexts = item.item[key + 'Mods'];

                    if (entry && entry.entries && modTexts) {
                        const newModTexts = modTexts.map((modItem: any, index: number) => {
                            let oldText = '';
                            let hash = '';
                            const isObject = typeof modItem === 'object' && modItem !== null;

                            if (isObject) {
                                oldText = modItem.description || '';
                                hash = modItem.hash || '';
                            } else {
                                oldText = modItem || '';
                            }

                            let mod: any = null;
                            // 1. 若词条对象自带 hash，优先查找
                            if (hash) {
                                const statId = hash.split('.').pop();
                                mod = entry.entries.find((a: any) => a.id === statId);
                            }

                            // 2. 第一轨：从官方 hashes 中查找声明归属本行 index 的条目，并进行英文语义一致性校验
                            if (!mod && Array.isArray(mods)) {
                                const m = mods.find((item: any) => Array.isArray(item[1]) && item[1].includes(index));
                                if (m && m[0]) {
                                    const targetId = m[0];
                                    const candidate = entry.entries.find((a: any) => 
                                        a.id === targetId || 
                                        a.id === `${key}.${targetId}` || 
                                        a.id.endsWith(targetId)
                                    );
                                    // 🛡️ 核心质检门：候选条目必须与当前行的英文模式一致，杜绝任何张冠李戴
                                    if (candidate && candidate.text) {
                                        if (extractNormalizedPattern(candidate.text) === extractNormalizedPattern(oldText)) {
                                            mod = candidate;
                                        }
                                    }
                                }
                            }

                            // 3. 第二轨：若 hashes 缺失（如新赛季符文/命定无 hash），通过纯文本指纹正向兜底查找
                            if (!mod && entry.entries) {
                                const currentPattern = extractNormalizedPattern(oldText);
                                if (currentPattern) {
                                    mod = entry.entries.find((a: any) => 
                                        a.text && extractNormalizedPattern(a.text) === currentPattern
                                    );
                                }
                            }

                            if (mod && mod.twText) {
                                let newModText = mod.twText;
                                const values = oldText.match(/[+-]?(\d*\.\d+|\d+)/g);
                                if (values) {
                                    let i = 0;
                                    values.forEach(v => {
                                        newModText = newModText.replace(/#/, values[i++]);
                                    });
                                }

                                // 🌟 动态涂油天赋匹配：直接从 stats.json 提取出的 875 条官方映射中寻找
                                if (mod.twText.indexOf('配置 #') > -1 || (mod.text && mod.text.indexOf('配置 #') > -1)) {
                                    const val = oldText
                                        .replace(/\[[^|\]]*\||[\][]/g, '')
                                        .replace(/^Allocates\s+/i, '')
                                        .trim();
                                    const valNoQuote = val.replace(/'s/g, 's');
                                    const twTalent = dynamicAllocatesMap.get(val) || dynamicAllocatesMap.get(valNoQuote);
                                    if (twTalent) {
                                        newModText = newModText.replace(/#/, twTalent);
                                    }
                                }

                                if (newModText.match(/增加/) && oldText.match(/reduced/i)) {
                                    newModText = newModText.replace(/增加/, '降低');
                                }

                                if (newModText !== oldText) {
                                    const combinedText = `${newModText} (${oldText})`;
                                    return isObject ? { ...modItem, description: combinedText } : combinedText;
                                }
                            }
                            return modItem;
                        });
                        item.item[key + 'Mods'] = newModTexts;
                    }
                });
            }

            // 3. 翻译基础属性 (properties)
            if (item.item.properties && Array.isArray(item.item.properties)) {
                item.item.properties.forEach((p: any) => {
                    if (p.name) {
                        const simp = p.name.replace(/\[[^|\]]*\||[\][]/g, '');
                        p.name = trans4twProps(simp);
                    }
                });
            }

            // 4. 翻译装备需求 (requirements)
            if (item.item.requirements && Array.isArray(item.item.requirements)) {
                item.item.requirements.forEach((p: any) => {
                    if (p.name) {
                        const simp = p.name.replace(/\[[^|\]]*\||[\][]/g, '');
                        p.name = trans4twProps(simp);
                    }
                });
            }

            // 5. 🌟 专门接管珠宝与特殊天赋详细属性 (notableProperties)
            if (item.item.notableProperties && Array.isArray(item.item.notableProperties)) {
                item.item.notableProperties.forEach((notable: any) => {
                    // 5.1 翻译天赋标题 (如 Replenishing Horde -> 群集復甦 (Replenishing Horde))
                    if (notable.name) {
                        const rawName = notable.name.trim();
                        const rawNoQuote = rawName.replace(/'s/g, 's');
                        const twName = dynamicAllocatesMap.get(rawName) || dynamicAllocatesMap.get(rawNoQuote);
                        if (twName && twName !== rawName) {
                            notable.name = `${twName} (${rawName})`;
                        }
                    }

                    // 5.2 翻译天赋具体效果说明行 (values)
                    if (Array.isArray(notable.values)) {
                        notable.values.forEach((valArr: any) => {
                            if (Array.isArray(valArr) && typeof valArr[0] === 'string') {
                                const rawVal = valArr[0];
                                // 清洗官方富文本标签与换行：例如 "[Critical|Critical Hit]" -> "Critical Hit"
                                const pureEn = rawVal
                                    .replace(/\[[^|\]]*\||[\][]/g, '')
                                    .replace(/\r?\n/g, ' ')
                                    .trim();
                                const pattern = extractNormalizedPattern(pureEn);

                                let matchedTw = pattern ? statsPatternMap.get(pattern) : null;
                                if (matchedTw) {
                                    const nums = pureEn.match(/[+-]?(\d*\.\d+|\d+)/g);
                                    if (nums) {
                                        let idx = 0;
                                        matchedTw = matchedTw.replace(/#/g, () => nums[idx++] || '#');
                                    }
                                    if (matchedTw !== pureEn) {
                                        valArr[0] = `${matchedTw} (${pureEn})`;
                                    }
                                }
                            }
                        });
                    }
                });
            }
        });

        return response;
    } catch (e) {
        console.error('[FetchParser Error]', e);
        return response;
    }
}
