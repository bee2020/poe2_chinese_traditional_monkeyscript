import rawTwStatic from '../dict/static.json';

const twStatic: any = rawTwStatic;

/**
 * 🌟 通货与静态标签解析器 (/api/trade2/data/static)
 */
export function parseStaticData(response: any, dataMap: any): any {
    try {
        const result = response.result;
        if (!Array.isArray(result) || !twStatic || !Array.isArray(twStatic.result)) return response;

        result.forEach((type: any) => {
            const findTwType = twStatic.result.find((s: any) => s.id === type.id);
            if (findTwType) {
                if (findTwType.zh_tw?.label) {
                    type.label = findTwType.zh_tw.label;
                }
                if (Array.isArray(type.entries) && Array.isArray(findTwType.entries)) {
                    type.entries.forEach((entry: any) => {
                        const findTwEntry = findTwType.entries.find((twEntry: any) => twEntry.id === entry.id);
                        if (findTwEntry && findTwEntry.zh_tw?.text) {
                            entry.text = findTwEntry.zh_tw.text;
                        }
                    });
                }
            }
        });

        response.result = result;
        dataMap['static'] = result;
        GM_setValue('dataMap', dataMap);
        return response;
    } catch (e) {
        console.error('[StaticParser Error]', e);
        return response;
    }
}
