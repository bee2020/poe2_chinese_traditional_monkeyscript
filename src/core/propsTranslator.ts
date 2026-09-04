import rawTwProps from '../dict/props.json';

const twProps: Record<string, string> = rawTwProps;

/**
 * 🌟 基础属性与需求官方繁中翻译函数
 */
export const trans4twProps = (text: string): string => {
    if (!text) return text;
    if (twProps[text]) {
        return twProps[text];
    }
    const list = text.split(' ');
    let trans = '';
    list.forEach(item => {
        if (twProps[item]) {
            trans += twProps[item];
        }
    });
    if (trans) return trans;
    const find = Object.keys(twProps).find(a => text.includes(a));
    if (find) {
        return text.replace(find, twProps[find]);
    }
    return text;
};
