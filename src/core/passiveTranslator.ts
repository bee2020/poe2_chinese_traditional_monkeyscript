import rawPassives from '../dict/passives.json';

interface PassiveDescription {
    id: string;
    enName: string;
    twName: string;
    en: string[];
    tw: string[];
}

const clean = (text: string) => text.replace(/\[[^|\]]*\||[\][]/g, '').replace(/\s+/g, ' ').trim();
const normalized = (text: string) => clean(text).toLowerCase();
const byName = new Map<string, PassiveDescription | null>();
for (const entry of (rawPassives as any).entries as PassiveDescription[]) {
    for (const name of [entry.enName, entry.twName]) {
        const key = normalized(name);
        const existing = byName.get(key);
        if (byName.has(key) && (!existing || existing.id !== entry.id)) byName.set(key, null);
        else byName.set(key, entry);
    }
}

/** 按构建时核对过 ID 的节点，严格核对整段原文，保留常量与全部英文。 */
export function translatePassiveDescription(name: string, values: any[]): { name: string; values: any[] } | null {
    if (typeof name !== 'string' || !Array.isArray(values) || !values.length) return null;
    const entry = byName.get(normalized(name));
    if (!entry || values.some(row => !Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || row[1] !== values[0][1])) return null;
    const original = values.map(row => row[0]);
    if (normalized(original.join('\n')) !== normalized(entry.en.join('\n'))) return null;
    // 整段说明配对，不推测每一行的中英文对应顺序，也不回填任何数字。
    const description = `${entry.tw.join('\n')}\n(${original.join('\n')})`;
    return {
        name: name === entry.twName ? name : `${entry.twName} (${name})`,
        values: [[description, values[0][1]]]
    };
}
