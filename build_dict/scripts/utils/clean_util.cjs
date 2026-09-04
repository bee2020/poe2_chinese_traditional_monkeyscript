/**
 * POE2 文本与 HTML 通用清洗及签名归一化工具模块
 */

/**
 * 统一清洗文本并生成通用数值通配签名 (#)
 * @param {string} text 待清洗的原始 HTML / 文本
 * @param {boolean} isStat 是否为属性词缀（如果是，将数值归一化为 #）
 * @returns {string} 清洗后的标准化文本/签名
 */
function cleanAndToSign(text, isStat = false) {
    if (!text) return '';
    let clean = text
        // 1. 优先剔除带有内容的分类徽章标签 (如 <span class="badge bg-primary...">Damage</span>)
        .replace(/<span\s+class="badge[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
        // 2. 换行与通用 HTML 标签剥离
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/[\r\n\t]+/g, ' ')
        // 3. HTML 实体转义与特殊符号归一化
        .replace(/&ndash;|&mdash;|—|-/g, '—')
        .replace(/&#39;|'/g, "'")
        .replace(/&quot;|"/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        // 4. 装备与槽位标签通用剥离
        .replace(/\s*\(Local\)/gi, '')
        .replace(/^(?:Martial Weapon|Wand or Staff|Armour|Focus|Shield|Bow|Crossbow|Two Handed|One Handed)\s*:\s*/i, '')
        .replace(/^(?:軍用武器|法杖或長杖|護甲|法器|盾牌|弓|弩|雙手武器|單手武器)\s*:\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 5. 词缀数值与百分比通配符归一化
    if (isStat) {
        clean = clean
            .replace(/([-|+]?\d+(?:\.\d+)?)/g, '#')
            .replace(/(#\s*—\s*#)/g, '#')
            .replace(/#\s*至\s*#/g, '#')
            .replace(/\+#/g, '#')
            // 归一化包裹数值的各种小括号 (例如 (#)%、(#%) 统一转为 #%)
            .replace(/\(\s*[#\s\d—至+-]+\s*\)%/g, '#%')
            .replace(/\(\s*[#\s\d—至+-]+%\s*\)/g, '#%')
            .replace(/\([#\s\d—至+-]+\)/g, '#')
            .replace(/\(#\)/g, '#')
            .replace(/\(\+#\)/g, '#')
            .replace(/\bevery second\b/gi, 'every # seconds')
            .replace(/\s+/g, ' ')
            .trim();
    }
    return clean;
}

module.exports = {
    cleanAndToSign
};
