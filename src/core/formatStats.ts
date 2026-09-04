import rawTwStats from '../dict/stats.json';

export const txTradeFormatstats: any[] = [];

const twStats: any = rawTwStats;

if (twStats && Array.isArray(twStats.result)) {
    twStats.result.forEach((item: any) => {
        const newEntries: any[] = [];
        if (Array.isArray(item.entries)) {
            item.entries
                .filter((a: any) => !a.text || a.text.indexOf('遺產') < 0 && a.text.indexOf('遗产') < 0)
                .forEach((e: any) => {
                    const cleanText = (e.zh_tw?.text || e.text || '').replace(/\[[^|\]]*\||[\][]/g, '');
                    if (e.option && e.option.options && cleanText.indexOf('#') > -1) {
                        e.option.options.forEach((o: any) => {
                            const optText = o.zh_tw?.text || o.text || '';
                            const texts = optText.split('\n');
                            texts.forEach((t: string) => {
                                newEntries.push({
                                    id: e.id,
                                    option: o.id,
                                    text: cleanText.replace('#', t)
                                });
                            });
                        });
                    } else {
                        newEntries.push({
                            id: e.id,
                            text: cleanText
                        });
                    }
                });
        }
        txTradeFormatstats.push({
            id: item.id,
            label: item.zh_tw?.label || item.label,
            entries: newEntries
        });
    });
}
