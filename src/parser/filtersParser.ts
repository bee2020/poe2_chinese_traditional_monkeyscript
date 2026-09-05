import rawTwFilters from '../dict/filters.json';

const twFilters: any = rawTwFilters;

/**
 * 🌟 交易过滤器解析器 (/api/trade2/data/filters)
 * 100% 纯动态权威字典驱动 (直接读取 dict/filters.json 中的 zh_tw 官方繁中)
 */
export function parseFiltersData(response: any, dataMap: any): any {
    try {
        const result = response.result;
        if (!Array.isArray(result) || !twFilters || !Array.isArray(twFilters.result)) return response;

        let translatedTypes = 0;
        let translatedFilters = 0;

        result.forEach((type: any) => {
            const findTwType = twFilters.result.find((s: any) => s.id === type.id);
            if (findTwType) {
                // 1. 动态注入分类标题繁中 (如 裝備篩選器, 物品需求, 終局篩選器)
                if (findTwType.zh_tw?.title) {
                    type.title = findTwType.zh_tw.title;
                    translatedTypes++;
                }
                if (Array.isArray(type.filters)) {
                    type.filters.forEach((f: any) => {
                        const findtwf = findTwType.filters?.find((twf: any) => twf.id === f.id);
                        if (findtwf) {
                            // 2. 动态注入条目标题繁中 (如 傷害, 護甲, 換界石階級, 寶石等級)
                            if (findtwf.zh_tw?.text) {
                                f.text = findtwf.zh_tw.text;
                                f.title = findtwf.zh_tw.text;
                                translatedFilters++;
                            } else if (f.id === 'ward') {
                                // 针对官方 API 原生唯一遗漏的 Runic Ward 做兜底
                                f.text = '符文護盾';
                                f.title = '符文護盾';
                                translatedFilters++;
                            }

                            // 3. 动态注入下拉框选项繁中 (如 崇高石, 混沌石, 是, 否, 任何)
                            if (f.option && Array.isArray(f.option.options) && findtwf.option && Array.isArray(findtwf.option.options)) {
                                f.option.options.forEach((o: any) => {
                                    const findtwfo = findtwf.option.options.find((fo: any) => fo.id === o.id);
                                    if (findtwfo && findtwfo.zh_tw?.text) {
                                        o.text = findtwfo.zh_tw.text;
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });

        console.log(`[POE2繁中增强] 📊 filtersParser 处理完成: 成功汉化 ${translatedTypes} 个分类大标题，${translatedFilters} 个过滤项标签`);

        response.result = result;
        dataMap['filters'] = result;
        GM_setValue('dataMap', dataMap);
        return response;
    } catch (e) {
        console.error('[POE2繁中增强] ❌ [FiltersParser Error]', e);
        return response;
    }
}
