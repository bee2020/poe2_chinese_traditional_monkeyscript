import rawTwStats from '../dict/stats.json';

const twStats: any = rawTwStats;

// 🌟 纯动态从官方 stats.json 提取全量涂油天赋对照 (完全消灭 603 条手写死数据 allocates.json)
// GGG 官方 stats.json 中自带 875 条形如 "enchant.stat_2954116742|25482" 的词缀
export const dynamicAllocatesMap = new Map<string, string>();

if (twStats && Array.isArray(twStats.result)) {
    for (const group of twStats.result) {
        if (!Array.isArray(group.entries)) continue;
        for (const entry of group.entries) {
            if (entry.id && entry.id.startsWith('enchant.stat_2954116742|')) {
                const enRaw = entry.text || '';
                const twRaw = entry.zh_tw?.text || '';
                // 英文通常为 "Allocates Beef"，繁中为 "配置壯漢"
                const enName = enRaw.replace(/^Allocates\s+/i, '').replace(/\[[^|\]]*\||[\][]/g, '').trim();
                const twName = twRaw.replace(/^配置\s*/i, '').replace(/\[[^|\]]*\||[\][]/g, '').trim();
                if (enName && twName) {
                    dynamicAllocatesMap.set(enName, twName);
                    // 兼容去掉所有格 's 的情况
                    dynamicAllocatesMap.set(enName.replace(/'s/g, 's'), twName);
                }
            }
        }
    }
}

/**
 * 🌟 词缀属性数据解析器 (/api/trade2/data/stats)
 */
export function parseStatsData(response: any, dataMap: any): any {
    try {
        const statMap: Record<string, string> = {};
        const deald: string[] = [];
        const result = response.result;
        if (!Array.isArray(result) || !twStats || !Array.isArray(twStats.result)) return response;

        result.forEach((type: any) => {
            const findTwType = twStats.result.find((twType: any) => twType.id === type.id);
            if (findTwType) {
                if (findTwType.zh_tw?.label) {
                    type.label = findTwType.zh_tw.label;
                }
                if (Array.isArray(type.entries) && Array.isArray(findTwType.entries)) {
                    type.entries.forEach((entry: any) => {
                        const findTwEntry = findTwType.entries.find((twEntry: any) => twEntry.id === entry.id);
                        if (findTwEntry && findTwEntry.zh_tw) {
                            const twText = findTwEntry.zh_tw.text || findTwEntry.text;

                            // 处理下拉选项类词缀 (例如带有 option.options)
                            if (entry.option && entry.option.options && entry.text && entry.text.indexOf('#') > -1) {
                                if (findTwEntry.option && findTwEntry.option.options) {
                                    entry.option.options.forEach((o: any) => {
                                        const findTwOption = findTwEntry.option.options.find((twOption: any) => twOption.id === o.id);
                                        if (findTwOption) {
                                            const optTwText = findTwOption.zh_tw?.text || findTwOption.text;
                                            if (optTwText && optTwText !== o.text) {
                                                o.text = `${optTwText}(${o.text})`;
                                                o.twText = optTwText;
                                            }
                                        }
                                    });
                                }
                            } else {
                                if (twText && twText !== entry.text) {
                                    entry.text = `${twText}(${entry.text})`;
                                    entry.twText = twText;
                                    if (entry.id && entry.id.includes('.')) {
                                        statMap[entry.id.split('.')[1]] = twText;
                                    }
                                }
                                if (findTwEntry.option && findTwEntry.option.options) {
                                    entry.option = findTwEntry.option;
                                }
                                deald.push(entry.id);
                            }
                        }
                    });
                }
            }
        });

        // 补齐同名未匹配词缀
        result.forEach((type: any) => {
            if (Array.isArray(type.entries)) {
                type.entries.forEach((entry: any) => {
                    if (deald.indexOf(entry.id) === -1) {
                        if (entry.id && entry.id.includes('.') && statMap[entry.id.split('.')[1]]) {
                            entry.text = statMap[entry.id.split('.')[1]];
                        }
                    }
                });
            }
        });

        response.result = result;
        dataMap['stats'] = result;
        GM_setValue('dataMap', dataMap);
        return response;
    } catch (e) {
        console.error('[StatsParser Error]', e);
        return response;
    }
}
