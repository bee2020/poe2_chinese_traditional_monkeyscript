import { parseItemsData } from './itemsParser';
import { parseStatsData } from './statsParser';
import { parseStaticData } from './staticParser';
import { parseFiltersData } from './filtersParser';
import { parseFetchResults } from './fetchParser';

/**
 * 🌟 网络拦截响应统一分发处理器 (严格联动 applyState 开关状态)
 */
export function dispatchResponseHook(
    request: any,
    res: any,
    applyState: number,
    dataMap: any,
    whisperMap: Record<string, string>
) {
    const responseText = res.responseText;
    if (!responseText) return;

    // 1. 处理私聊定位 token (无论繁体开启与否均正常支持)
    if (request.url.includes('api/trade2/whisper')) {
        try {
            const data = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
            const token = data?.token;
            if (token && whisperMap[token]) {
                fetch('http://127.0.0.1:29899/api/whisper', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ whisper: whisperMap[token] })
                }).catch(() => {});
            }
        } catch (e) {
            console.error('[Whisper Error]', e);
        }
        return;
    }

    // 2. 🌟 繁体化总开关控制：当 applyState !== 1 (取消繁体化/关闭状态) 时，完全保持官方原始英文
    if (applyState !== 1) return;

    // 3. 处理搜索结果详情 (/api/trade2/fetch)
    if (request.url.includes('api/trade2/fetch')) {
        try {
            const response = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
            const modified = parseFetchResults(response, dataMap, whisperMap);
            res.responseText = JSON.stringify(modified);
        } catch (e) {
            console.error('[Dispatch Fetch Error]', e);
        }
        return;
    }

    // 4. 处理元数据字典接口 (/api/trade2/data/*)
    if (request.url.includes('api/trade2/data')) {
        const cleanUrl = request.url.split('?')[0];
        const key = cleanUrl.split('/').pop();
        try {
            const response = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
            let modified = response;

            if (key === 'items') {
                modified = parseItemsData(response, dataMap);
            } else if (key === 'stats') {
                modified = parseStatsData(response, dataMap);
            } else if (key === 'static') {
                modified = parseStaticData(response, dataMap);
            } else if (key === 'filters') {
                modified = parseFiltersData(response, dataMap);
            }

            if (modified !== response) {
                res.responseText = JSON.stringify(modified);
                if (res.response && typeof res.response === 'object') {
                    res.response = modified;
                }
            }
        } catch (e) {
            console.error(`[Dispatch ${key} Error]`, e);
        }
    }
}
