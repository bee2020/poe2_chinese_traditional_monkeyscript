/**
 * POE2 文本与 HTML 通用清洗及签名归一化工具模块
 */

/**
 * 清洗文本并保留变量 #、固定常量和范围结构
 * @param {string} text 待清洗的原始 HTML / 文本
 * @param {boolean} isStat 是否为属性词缀（只规范已有占位符，不猜测数值是否可变）
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
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '—')
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

    // 保留所有原始数值和范围端点。具体数值不能无依据地变成变量。
    if (isStat) {
        clean = clean.replace(/\(\s*(\+?#)\s*\)/g, '$1');
    }
    return clean;
}

module.exports = {
    cleanAndToSign
};
