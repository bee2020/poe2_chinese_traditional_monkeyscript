import rawItems from '../dict/items.json';

const itemsData: any = rawItems;

// 🌟 纯动态构建内存双向映射字典 (完全替代原有 3000 行手写 typeTransMap.json)
export const itemTypeMap = new Map<string, string>();
export const itemNameMap = new Map<string, string>();

if (Array.isArray(itemsData)) {
    for (const group of itemsData) {
        if (!group.entries || !Array.isArray(group.entries)) continue;
        for (const entry of group.entries) {
            if (entry.type && entry.zh_tw?.type) {
                itemTypeMap.set(entry.type, entry.zh_tw.type);
            }
            if (entry.name && entry.zh_tw?.name) {
                itemNameMap.set(entry.name, entry.zh_tw.name);
            }
        }
    }
}

/**
 * 通用物品名称与基底翻译辅助函数 (供 fetchParser 等模块复用)
 */
export function translateItemText(rawText: string): string {
    if (!rawText) return rawText;
    if (itemNameMap.has(rawText)) {
        return itemNameMap.get(rawText)!;
    }
    if (itemTypeMap.has(rawText)) {
        return itemTypeMap.get(rawText)!;
    }
    return rawText;
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
                    const twType = itemTypeMap.get(item.type);
                    if (twType) {
                        item.text = twType;
                    }
                } else {
                    const twName = itemNameMap.get(item.name);
                    if (twName) {
                        const twType = itemTypeMap.get(item.type) || item.type;
                        item.text = `${twName} ${twType}`;
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
