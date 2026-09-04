import { translateItemText } from './itemsParser';
import { dynamicAllocatesMap } from './statsParser';
import { trans4twProps } from '../core/propsTranslator';

const fieldsToTranslate = ['baseType', 'name', 'typeLine'];

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
            fieldsToTranslate.forEach(field => {
                if (item.item[field]) {
                    const translated = translateItemText(item.item[field]);
                    if (translated && translated !== item.item[field]) {
                        item.item[field] = translated;
                    }
                }
            });

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
                            if (hash) {
                                const statId = hash.split('.').pop();
                                mod = entry.entries.find((a: any) => a.id === statId);
                            }

                            if (!mod && mods) {
                                const m = mods[index];
                                if (m) {
                                    mod = entry.entries.find((a: any) => a.id === m[0]);
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
        });

        return response;
    } catch (e) {
        console.error('[FetchParser Error]', e);
        return response;
    }
}
