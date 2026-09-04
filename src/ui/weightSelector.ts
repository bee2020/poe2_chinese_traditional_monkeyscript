import rawTwStats from '../dict/stats.json';
import { initModel, initSlectMy } from './presetManager';
import { UI_TEXT } from './uiMapping';
import { createEl, createSelect } from './domHelper';

// 允许计入权重的词缀来源类型 (装备固有、普通掉落、工艺台打造、符文、破裂)
const ALLOWED_WEIGHT_TYPES = new Set(['explicit', 'crafted', 'rune', 'fractured', 'augment']);

// 纯动态匹配规则 (正则特征驱动，涵盖物理/元素/混沌全系点伤，以及通用/攻击/法术全系爆伤)
const isFlatDamage = (text: string) =>
    /^Adds\s+#\s+to\s+#\s+(Physical|Fire|Cold|Lightning|Chaos)(\s+damage)?(\s+to\s+attacks)?$/i.test(text);

const isCritDamage = (text: string) =>
    /^(#% to|#% increased)?\s*Critical\s+(Damage|Spell Damage)\s*Bonus(\s+for\s+Attack\s+Damage)?$/i.test(text);

/**
 * 🌟 从官方 stats.json 纯动态构建权重词缀组
 */
function buildDynamicPresetFilters(matcher: (text: string) => boolean): any[] {
    const filters: any[] = [];
    const statsData: any = rawTwStats;

    if (statsData && Array.isArray(statsData.result)) {
        statsData.result.forEach((cat: any) => {
            if (!ALLOWED_WEIGHT_TYPES.has(cat.id)) return;
            if (Array.isArray(cat.entries)) {
                cat.entries.forEach((e: any) => {
                    if (e.text && matcher(e.text)) {
                        filters.push({
                            id: e.id,
                            value: { weight: 1 },
                            disabled: false
                        });
                    }
                });
            }
        });
    }

    return filters;
}

/**
 * 🌟 初始化预设综合权重下拉选择框 (Sum / Weight Preset Selector)
 */
export function initWeightSelector() {
    // 1. 初始化预设综合选项下拉框
    const initSumSelect = setInterval(() => {
        const targetSelect = document.querySelector('.multiselect.filter-select.filter-group-select');
        if (!targetSelect) return;

        initModel();
        const statsDiv = targetSelect.closest('span')?.closest('div');
        if (!statsDiv) return;

        if (statsDiv.querySelector('.preset-weight-container')) return;

        // 动态选项定义（文案 100% 归口 uiMapping 繁中）
        const presetOptions = [
            { key: 'flatDamage', label: UI_TEXT.presetFlatDamage, matcher: isFlatDamage },
            { key: 'critDamage', label: UI_TEXT.presetCritDamage, matcher: isCritDamage }
        ];

        // 🌟 声明式创建下拉选择框 (样式与下方已保存预设输入框完全一致)
        const selectBox = createSelect({
            className: 'multiselect',
            style: {
                width: '50%',
                background: '#1e2124',
                color: '#fff',
                textAlign: 'center',
                marginLeft: '50%',
                marginTop: '20px',
                padding: '5px',
                border: 'none',
                borderRadius: '4px'
            },
            options: [
                { value: '', label: UI_TEXT.presetSelectDefault },
                ...presetOptions.map(p => ({ value: p.key, label: p.label }))
            ],
            onChange: (selectedKey) => {
                if (!selectedKey) return;
                const targetPreset = presetOptions.find(p => p.key === selectedKey);
                if (!targetPreset) return;

                const dynamicFilters = buildDynamicPresetFilters(targetPreset.matcher);
                if (!dynamicFilters.length) return;

                const newStat: any = {
                    type: "weight",
                    value: { min: 1 },
                    filters: dynamicFilters,
                    disabled: false
                };

                unsafeWindow?.app?.$store?.commit("pushStatGroup", newStat);
            }
        });

        const container = createEl('div', {
            className: 'multiselect filter-select filter-group-select preset-weight-container',
            children: [selectBox]
        });

        statsDiv.appendChild(container);

        initSlectMy();
        clearInterval(initSumSelect);
    }, 1000);

    // 2. 动态注入「保存预设」按钮到词缀组头部 (仅第一次注入成功后即停止，不再无限循环)
    const addBtnInterval = setInterval(() => {
        if (!document.querySelector('.multiselect.filter-select.filter-group-select')) return;

        const mainStatDiv = document.querySelector('.search-advanced-pane.brown .filter-group-header .filter-body');
        if (!mainStatDiv) return;

        const nextSibling = mainStatDiv.nextElementSibling;
        if (!nextSibling || !nextSibling.classList.contains('saveStat')) {
            const saveBtnSpan = createEl('span', {
                className: 'input-group-btn saveStat',
                html: `<button class="btn" style="margin-left:5px;cursor:pointer;">${UI_TEXT.btnSavePreset}</button>`
            });
            mainStatDiv.insertAdjacentElement('afterend', saveBtnSpan);

            // 🌟 第一次成功加入后，立即清除定时器，彻底停止！
            clearInterval(addBtnInterval);
        } else {
            // 页面如果已存在该按钮，也立即销毁定时器
            clearInterval(addBtnInterval);
        }
    }, 1000);
}
