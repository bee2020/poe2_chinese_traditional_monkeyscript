/**
 * 🌟 網頁靜態 DOM 安全替換字典 (DOM Translations)
 * 僅負責頂欄導航、系統選單等無法透過 API 攔截的純靜態 HTML 文字
 */
export const domTranslations: Record<string, string> = {
    // 导航与基础
    "Search Listed Items": "市集搜尋",
    "SEARCH LISTED ITEMS": "市集搜尋",
    "Bulk Item Exchange": "大宗交易",
    "BULK ITEM EXCHANGE": "大宗交易",
    "Online Only": "僅在線",
    "Online In League": "賽季在線",
    "Whisper Language": "私聊語言",
    "Last Client Language (Default)": "最近使用的客戶端語言",
    "Show Filters": "顯示過濾條件",
    "Hide Filters": "隱藏過濾條件",
    "Settings": "設定",
    "SETTINGS": "設定",
    "About": "關於",
    "ABOUT": "關於",
    "English": "英文",
    "Search Items...": "搜尋物品...",
    "SEARCH ITEMS...": "搜尋物品...",

    // 过滤器大分类折叠标题 (大小写全面兼容)
    "Type Filters": "類別過濾",
    "TYPE FILTERS": "類別過濾",
    "Stat Filters": "屬性過濾",
    "STAT FILTERS": "屬性過濾",
    "Equipment Filters": "裝備過濾",
    "EQUIPMENT FILTERS": "裝備過濾",
    "Requirements": "需求過濾",
    "REQUIREMENTS": "需求過濾",
    "Endgame Filters": "終局過濾",
    "ENDGAME FILTERS": "終局過濾",
    "Map Filters": "地圖過濾",
    "MAP FILTERS": "地圖過濾",
    "Miscellaneous": "其它過濾",
    "MISCELLANEOUS": "其它過濾",
    "Trade Filters": "交易過濾",
    "TRADE FILTERS": "交易過濾",

    // 过滤器内部条目名
    "Item Category": "道具分類",
    "ITEM CATEGORY": "道具分類",
    "Item Rarity": "物品稀有度",
    "ITEM RARITY": "物品稀有度",
    "Item Level": "物品等級",
    "ITEM LEVEL": "物品等級",
    "Item Quality": "物品品質",
    "ITEM QUALITY": "物品品質",
    "Damage": "傷害",
    "DAMAGE": "傷害",
    "Attacks per Second": "每秒攻擊次數",
    "ATTACKS PER SECOND": "每秒攻擊次數",
    "Critical Chance": "暴擊率",
    "CRITICAL CHANCE": "暴擊率",
    "Damage per Second": "每秒傷害",
    "DAMAGE PER SECOND": "每秒傷害",
    "Physical DPS": "物理每秒傷害",
    "PHYSICAL DPS": "物理每秒傷害",
    "Elemental DPS": "元素每秒傷害",
    "ELEMENTAL DPS": "元素每秒傷害",
    "Reload Time": "填裝時間",
    "RELOAD TIME": "填裝時間",
    "Armour": "護甲",
    "ARMOUR": "護甲",
    "Evasion": "閃避",
    "EVASION": "閃避",
    "Energy Shield": "能量護盾",
    "ENERGY SHIELD": "能量護盾",

    // 常用按钮与占位
    "+ Add Stat Filter": "+ 新增屬性過濾",
    "+ ADD STAT FILTER": "+ 新增屬性過濾",
    "+ Add Stat Group": "+ 新增屬性分組",
    "+ ADD STAT GROUP": "+ 新增屬性分組",
    "Any": "任何",
    "ANY": "任何",
    "Min": "最小",
    "MIN": "最小",
    "Max": "最大",
    "MAX": "最大"
};

/**
 * 🌟 腳本自創注入 UI 組件的文案 Mapping (統一集中維護)
 */
export const UI_TEXT = {
    // 頂欄切換按鈕
    btnCancelTw: '取消繁體化',
    btnEnableTw: '開啟繁體化',
    btnAutoLg: '應用倉庫物品定位',

    // 倉庫定位反饋
    autoLgSuccess: '應用私聊語言為客戶端語言成功，收到物品交易私聊組隊後會在倉庫自動定位物品位置',
    autoLgFailed: '設置失敗，請確認已登入交易網站。',

    // 預設管理與綜合權重
    btnSavePreset: '保存預設',
    presetDropdownPlaceholder: '已保存的預設配置...',
    presetSelectDefault: '預設綜合權重選項...',
    presetFlatDamage: '綜合點傷權重',
    presetCritDamage: '綜合爆傷權重',

    // 模態彈窗相關文案
    modalTitle: '保存詞綴預設',
    modalInputPlaceholder: '請輸入預設名稱',
    btnSave: '保存',
    btnCancel: '取消',
    promptEnterName: '請輸入預設名稱'
} as const;

/**
 * 便捷的 UI 文本獲取函數
 */
export function getUIText<K extends keyof typeof UI_TEXT>(key: K): (typeof UI_TEXT)[K] {
    return UI_TEXT[key];
}
