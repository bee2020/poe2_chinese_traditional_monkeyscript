/** 数值模板：只捕获占位符，固定数值始终参与匹配。 */
export interface StatTemplate {
    source: string;
    target: string;
    matcher: RegExp;
    variables: number[];
}

export interface TemplateValidation {
    template?: StatTemplate;
    reason?: string;
}

export function normalizeStatText(text: string): string {
    const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    return text.replace(/\[[^|\]]*\||[\][]/g, '')
        .replace(/^Bonded:\s*/i, '')
        .replace(/\b(every|per)\s+(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
            (_, prefix, word) => `${prefix} ${numberWords.indexOf(word.toLowerCase())}`)
        .replace(/\s+/g, ' ').trim();
}

const variablePattern = /\{(\d+)\}/g;
const numericPattern = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function numberVariables(text: string): string {
    let index = 0;
    return text.replace(/#/g, () => `{${index++}}`);
}

export function createStatMatcher(source: string): RegExp | null {
    if (typeof source !== 'string' || !source.trim()) return null;
    const normalized = numberVariables(normalizeStatText(source));
    let previous = 0;
    let pattern = '';
    for (const match of normalized.matchAll(variablePattern)) {
        pattern += escapeRegex(normalized.slice(previous, match.index)) + `(${numericPattern})`;
        previous = match.index + match[0].length;
    }
    pattern += escapeRegex(normalized.slice(previous));
    return new RegExp(`^${pattern}$`, 'i');
}

/**
 * 旧 # 模板仅自动接受单变量或明确的 # to # / #至# 范围。
 * 其他多变量必须提供经过核对的 {0}/{1} 模板，禁止猜测变量顺序。
 */
export function compileStatTemplate(source: string, target: string): TemplateValidation {
    if (typeof source !== 'string' || typeof target !== 'string' || !source.trim() || !target.trim()) {
        return { reason: '缺少双语模板' };
    }
    let en = normalizeStatText(source);
    let tw = normalizeStatText(target);
    const enCount = (en.match(/#/g) || []).length;
    const twCount = (tw.match(/#/g) || []).length;
    const enIndexed = /\{\d+\}/.test(en), twIndexed = /\{\d+\}/.test(tw);
    if (!enIndexed && !twIndexed && enCount !== twCount) return { reason: '双语占位符数量不一致' };
    if ((enCount && enIndexed) || (twCount && twIndexed)) {
        return { reason: '不能混用占位符格式' };
    }
    if (!twIndexed && enCount > 1 && !(enCount === 2 &&
        /#\s+to\s+#/i.test(en) && /#\s*(?:至|到)\s*#/.test(tw))) {
        return { reason: '多变量顺序未经确认' };
    }
    en = numberVariables(en);
    tw = numberVariables(tw);
    const ids = (text: string) => Array.from(text.matchAll(variablePattern), m => Number(m[1]));
    const enIds = ids(en);
    const twIds = ids(tw);
    if (new Set(enIds).size !== enIds.length || new Set(twIds).size !== twIds.length ||
        [...enIds].sort().join(',') !== [...twIds].sort().join(',')) {
        return { reason: '变量编号缺失或重复' };
    }
    const constants = (text: string) => (text.replace(variablePattern, '').match(/[+-]?(?:\d+(?:\.\d+)?|\.\d+)/g) || [])
        .map(value => String(Number(value))).sort().join(',');
    if (constants(en) !== constants(tw)) return { reason: '双语固定数值不一致' };
    const matcher = createStatMatcher(en);
    if (!matcher) return { reason: '英文模板无效' };
    return { template: { source: en, target: tw, matcher, variables: enIds } };
}

export function renderStatTemplate(template: StatTemplate, text: string): string | null {
    if (typeof text !== 'string') return null;
    const match = template.matcher.exec(normalizeStatText(text));
    if (!match) return null;
    const values = new Map(template.variables.map((id, index) => [id, match[index + 1]]));
    return template.target.replace(variablePattern, (_, id) => values.get(Number(id))!);
}
