import rawStats from '../dict/stats.json';
import { compileStatTemplate, createStatMatcher, normalizeStatText, renderStatTemplate, StatTemplate } from './statTemplate';

interface Candidate {
    id: string;
    matcher: RegExp;
    template?: StatTemplate;
    bonded: boolean;
}

/** 直接读取内置原文字典，不使用 GM 缓存中已经拼接中文的 text/twText。 */
const byId = new Map<string, Candidate[]>();
const byCategory = new Map<string, Candidate[]>();
const all: Candidate[] = [];
for (const category of (rawStats as any).result || []) {
    const candidates: Candidate[] = [];
    for (const entry of category.entries || []) {
        if (!entry.id || !entry.text) continue;
        const matcher = createStatMatcher(entry.text);
        if (!matcher) continue;
        const { template } = compileStatTemplate(entry.text, entry.zh_tw?.template || entry.zh_tw?.text);
        const candidate = { id: entry.id, matcher, template, bonded: /^Bonded:\s*/i.test(entry.text.trim()) };
        if (!byId.has(entry.id)) byId.set(entry.id, []);
        byId.get(entry.id)!.push(candidate);
        candidates.push(candidate);
        all.push(candidate);
    }
    byCategory.set(category.id, candidates);
}

/** hash 用于优先定位；找不到或文本不对应时，仍允许无歧义的严格全文匹配。 */
export function translateStatText(text: string, category?: string, hashes: string[] = []): string | null {
    if (typeof text !== 'string' || !text.trim()) return null;
    const normalized = normalizeStatText(text);
    const resolve = (candidates: Candidate[]) => {
        const matched = candidates.filter(candidate => candidate.matcher.test(normalized));
        if (!matched.length) return { matched: false, value: null };
        // 命中了不安全模板或多个冲突译文时，不再换一组候选来绕过校验。
        if (matched.some(candidate => !candidate.template)) return { matched: true, value: null };
        const results = new Set(matched.map(candidate => renderStatTemplate(candidate.template!, text)));
        return { matched: true, value: results.size === 1 ? results.values().next().value : null };
    };
    if (hashes.length) {
        const hinted = hashes.flatMap(id => byId.get(id) || byId.get(`${category}.${id}`) || []);
        const result = resolve(hinted);
        if (result.matched) return result.value;
    }
    if (category) {
        const scoped = resolve(byCategory.get(category) || []);
        if (scoped.matched) return scoped.value;
    }
    // 技能词条等可能位于独立分类。命定词条不能污染普通词条的全局匹配。
    const bonded = /^Bonded:\s*/i.test(text.trim());
    return resolve(all.filter(candidate => candidate.bonded === bonded)).value;
}
