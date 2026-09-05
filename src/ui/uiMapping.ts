/**
 * 🌟 網頁靜態 DOM 安全替換字典 (DOM Translations)
 * 僅負責頂欄導航、系統選單等無法透過 API 攔截的純靜態 HTML 文字
 */
export const domTranslations: Record<string, string> = {
    "Search Listed Items": "市集搜尋",
    "Bulk Item Exchange": "大宗交易",
    "Online Only": "僅在線",
    "Online In League": "賽季在線",
    "Whisper Language": "私聊語言",
    "Last Client Language (Default)": "最近使用的客戶端語言",
    "Show Filters": "顯示過濾條件",
    "Hide Filters": "隱藏過濾條件",
    "Settings": "設定",
    "About": "關於",
    "English": "英文"
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
