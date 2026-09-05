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
            if ('json' in res) {
                res.json = modified;
            }
            const count = Array.isArray(modified?.result) ? modified.result.length : 0;
            console.log(`[POE2繁中增强] ✅ fetch 搜索结果注入成功 (${count} 件装备已繁中化)`);
        } catch (e) {
            console.error('[POE2繁中增强] ❌ [Dispatch Fetch Error]', e);
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
                console.log('[POE2繁中增强] 📦 items 元数据解析完成');
            } else if (key === 'stats') {
                modified = parseStatsData(response, dataMap);
                console.log('[POE2繁中增强] 📦 stats 词缀元数据解析完成');
            } else if (key === 'static') {
                modified = parseStaticData(response, dataMap);
                console.log('[POE2繁中增强] 📦 static 静态资源元数据解析完成');
            } else if (key === 'filters') {
                modified = parseFiltersData(response, dataMap);
                console.log('[POE2繁中增强] 📦 filters 过滤器元数据解析完成');
            }

            // 🌟 修复核心阻断：无论引用是否相同，必须切实写回到响应
            res.responseText = JSON.stringify(modified);
            if (res.response && typeof res.response === 'object') {
                res.response = modified;
            }
            if ('json' in res) {
                res.json = modified;
            }
            console.log(`[POE2繁中增强] 🚀 [${key}] 繁中元数据已成功写回浏览器响应！`);
        } catch (e) {
            console.error(`[POE2繁中增强] ❌ [Dispatch ${key} Error]`, e);
        }
    }
}
