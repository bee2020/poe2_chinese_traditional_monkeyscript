const categories = data => Array.isArray(data) ? data : data.result || [];
const visible = value => typeof value === 'string' && value.trim().length > 0;
const translated = (en, tw) => visible(tw) && tw.trim() !== String(en || '').trim();
const rate = (count, total) => total ? `${(count / total * 100).toFixed(2)}%` : '不适用';
const emptySummary = () => ({ total: 0, eligible: 0, complete: 0, partial: 0, missing: 0, excluded: 0, untranslated: [] });

function addState(summary, state, detail) {
    summary.total++;
    summary[state]++;
    if (state !== 'excluded') summary.eligible++;
    if (state === 'partial' || state === 'missing') summary.untranslated.push({ ...detail, state });
}

function finish(summary) {
    return { ...summary, finalTranslated: summary.complete, finalRate: rate(summary.complete, summary.eligible) };
}

function itemState(item) {
    if (/\[DNT\]/i.test(`${item.type || ''} ${item.name || ''}`)) return 'excluded';
    const fields = ['type', 'name'].filter(field => visible(item[field]));
    if (!fields.length) return 'excluded';
    const found = fields.filter(field => translated(item[field], item.zh_tw?.[field])).length;
    return found === fields.length ? 'complete' : found ? 'partial' : 'missing';
}

function summarizeItems(data) {
    const summary = emptySummary();
    for (const cat of categories(data)) {
        for (const item of cat.entries || []) {
            addState(summary, itemState(item), {
                category: cat.id, type: item.type || '', name: item.name || '', text: item.text || item.type || '',
                missingFields: ['type', 'name'].filter(field => visible(item[field]) && !translated(item[field], item.zh_tw?.[field]))
            });
        }
    }
    return finish(summary);
}

function summarizeEntries(data) {
    const summary = emptySummary();
    for (const cat of categories(data)) {
        for (const entry of cat.entries || []) {
            const state = !visible(entry.text) ? 'excluded' : translated(entry.text, entry.zh_tw?.text) ? 'complete' : 'missing';
            addState(summary, state, { category: cat.id, id: entry.id, en: entry.text || '' });
        }
    }
    return finish(summary);
}

function summarizeFilters(data) {
    const groups = { categories: emptySummary(), filters: emptySummary(), options: emptySummary() };
    const add = (group, en, tw, detail) => addState(group,
        !visible(en) ? 'excluded' : translated(en, tw) ? 'complete' : 'missing', detail);
    for (const cat of categories(data)) {
        add(groups.categories, cat.title, cat.zh_tw?.title, { category: cat.id, id: cat.id, field: 'title', en: cat.title || '' });
        for (const filter of cat.filters || []) {
            add(groups.filters, filter.text || filter.title, filter.zh_tw?.text || filter.zh_tw?.title,
                { category: cat.id, id: filter.id, field: 'text', en: filter.text || filter.title || '' });
            for (const option of filter.option?.options || []) {
                add(groups.options, option.text, option.zh_tw?.text,
                    { category: cat.id, id: `${filter.id}/${option.id}`, field: 'option', en: option.text || '' });
            }
        }
    }
    const summary = emptySummary();
    for (const group of Object.values(groups)) {
        for (const key of ['total', 'eligible', 'complete', 'partial', 'missing', 'excluded']) summary[key] += group[key];
        summary.untranslated.push(...group.untranslated);
    }
    return { ...finish(summary), breakdown: Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, finish(value)])) };
}

module.exports = { categories, visible, translated, rate, itemState, summarizeItems, summarizeEntries, summarizeFilters };
