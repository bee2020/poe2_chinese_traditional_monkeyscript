import { formatTranslatedItemText } from './itemsParser';
import { dynamicAllocatesMap } from './statsParser';
import { trans4twProps } from '../core/propsTranslator';
import { translateStatText } from '../core/statTranslator';
import { translatePassiveDescription } from '../core/passiveTranslator';

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

            // 1. 只翻译完整命中的名称/基底，始终保留当前字段的原始英文。
            // 随机名称和未知前后缀不做局部猜测；空 name 不影响基底翻译。
            fieldsToTranslate.forEach(field => {
                if (typeof item.item[field] !== 'string' || !item.item[field]) return;
                item.item[field] = formatTranslatedItemText(item.item[field], field === 'name' ? 'name' : 'type');
            });

            // 2. 只按可信模板捕获变量；无 hashes 时仍可做严格全文匹配。
            const hashes = item.item.extended?.hashes || {};
            for (const field of Object.keys(item.item)) {
                if (!field.endsWith('Mods') || !Array.isArray(item.item[field])) continue;
                const category = field.slice(0, -4);
                item.item[field] = item.item[field].map((modItem: any, index: number) => {
                    const isObject = modItem !== null && typeof modItem === 'object';
                    const oldText = isObject ? modItem.description : modItem;
                    if (typeof oldText !== 'string') return modItem;
                    const ids: string[] = isObject && typeof modItem.hash === 'string' && modItem.hash
                        ? [modItem.hash]
                        : (Array.isArray(hashes[category]) ? hashes[category] : [])
                            .filter((hash: any) => Array.isArray(hash?.[1]) && hash[1].includes(index))
                            .map((hash: any) => hash[0]).filter((id: any) => typeof id === 'string');
                    const translated = translateStatText(oldText, category, ids);
                    if (!translated || translated === oldText) return modItem;
                    const description = `${translated} (${oldText})`;
                    return isObject ? { ...modItem, description } : description;
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
                    const description = translatePassiveDescription(notable.name, notable.values);
                    if (description) {
                        notable.name = description.name;
                        notable.values = description.values;
                        return;
                    }
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
                                const translated = translateStatText(pureEn);
                                if (translated && translated !== pureEn) {
                                    valArr[0] = `${translated} (${pureEn})`;
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
