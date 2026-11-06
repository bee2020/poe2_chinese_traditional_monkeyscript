import rawItems from '../dict/items.json';

const itemsData: any = rawItems;

// 🌟 纯动态构建内存双向映射字典 (完全替代原有 3000 行手写 typeTransMap.json)
export const itemTypeMap = new Map<string, string>();
export const itemNameMap = new Map<string, string>();
const typeConflicts = new Set<string>();
const nameConflicts = new Set<string>();

function addTranslation(map: Map<string, string>, conflicts: Set<string>, original: string, translation: string) {
    if (typeof original !== 'string' || typeof translation !== 'string' || !translation.trim() || translation === original || conflicts.has(original)) return;
    if (map.has(original) && map.get(original) !== translation) {
        map.delete(original);
        conflicts.add(original);
    } else map.set(original, translation);
}

if (Array.isArray(itemsData)) {
    for (const group of itemsData) {
        if (!group.entries || !Array.isArray(group.entries)) continue;
        for (const entry of group.entries) {
            if (entry.type && entry.zh_tw?.type) {
                addTranslation(itemTypeMap, typeConflicts, entry.type, entry.zh_tw.type);
            }
            if (entry.name && entry.zh_tw?.name) {
                addTranslation(itemNameMap, nameConflicts, entry.name, entry.zh_tw.name);
            }
        }
    }
}

/**
 * 通用物品名称与基底翻译辅助函数 (供 fetchParser 等模块复用)
 */
export function translateItemText(rawText: string, field: 'type' | 'name' = 'type'): string {
    if (!rawText) return rawText;
    const map = field === 'name' ? itemNameMap : itemTypeMap;
    if (map.has(rawText)) return map.get(rawText)!;
    // 卓越物品是已确认的状态前缀：https://poe2db.tw/tw/Quality
    // 只接受“Exceptional + 完整已知基底”，不对任意名称做局部替换。
    const prefix = 'Exceptional ';
    if (field === 'type' && !typeConflicts.has(rawText) && rawText.startsWith(prefix)) {
        const base = itemTypeMap.get(rawText.slice(prefix.length));
        if (base) return `卓越${base}`;
    }
    return rawText;
}

export function formatTranslatedItemText(rawText: string, field: 'type' | 'name' = 'type'): string {
    const translated = translateItemText(rawText, field);
    return translated !== rawText ? `${translated} (${rawText})` : rawText;
}

/**
 * 🌟 物品/基底/暗金数据解析器 (/api/trade2/data/items)
 */
export function parseItemsData(response: any, dataMap: any): any {
    try {
        const result = response.result;
        if (!Array.isArray(result)) return response;

        for (const category of result) {
            if (!category.entries || !Array.isArray(category.entries)) continue;
            for (const item of category.entries) {
                if (!item.name) {
                    const twType = translateItemText(item.type);
                    if (twType && twType !== item.type) {
                        // 避免从已翻译的 text 再次追加括号。
                        item.text = formatTranslatedItemText(item.type);
                    }
                } else {
                    const twName = itemNameMap.get(item.name);
                    if (twName) {
                    const twType = itemTypeMap.get(item.type);
                    if (twType) item.text = `${twName} ${twType} (${item.name} ${item.type})`;
                    }
                }
            }
        }

        dataMap['items'] = result;
        GM_setValue('dataMap', dataMap);
        response.result = result;
        return response;
    } catch (e) {
        console.error('[ItemsParser Error]', e);
        return response;
    }
}
