import { UI_TEXT } from './uiMapping';
import { createEl, createInput, createButton } from './domHelper';

interface PresetData {
    inputName: string;
    statIndex: number;
    saveStats: any[];
}

const data: PresetData = {
    inputName: '',
    statIndex: -1,
    saveStats: GM_getValue('saveStats') ? GM_getValue('saveStats') : []
};

// 更新 DOM 的函数
function updateDOM(key: string, value: any) {
    const elements = document.querySelectorAll(`[data-bind="${key}"]`);
    elements.forEach(element => {
        if (element.tagName === 'INPUT') {
            (element as HTMLInputElement).value = value;
        } else {
            element.textContent = value;
        }
    });
}

// 🌟 使用 Proxy 响应式监听数据变化
export const presetProxy = new Proxy(data, {
    set(target: any, key: string, value: any) {
        target[key] = value;
        updateDOM(key, value);
        return true;
    }
});

/**
 * 打开保存预设弹窗
 */
export function openSaveModal(index: number) {
    presetProxy.statIndex = index;
    presetProxy.inputName = '';
    setTimeout(() => {
        const modal = document.querySelector('#save-modal') as HTMLElement;
        if (modal) {
            modal.style.display = 'block';
            if (typeof (modal as any).refreshList === 'function') {
                (modal as any).refreshList();
            }
        }
    }, 100);
}

/**
 * 🌟 1. 初始化预设下拉搜索与应用组件 (与官方 + ADD STAT GROUP 完全一致的 vue-multiselect 结构)
 */
export function initSlectMy() {
    const targetSelect = document.querySelector('.multiselect.filter-select.filter-group-select');
    const statsDiv = targetSelect?.closest('span')?.closest('div');
    if (!statsDiv) return;

    if (statsDiv.querySelector('.preset-dropdown-container')) return;

    // 🌟 外层容器：显式声明 position: relative 锁定下拉定位基准，尺寸对齐右半区
    const container = createEl('div', {
        className: 'multiselect filter-select filter-group-select preset-dropdown-container',
        attrs: { tabindex: '-1' },
        style: {
            position: 'relative',
            width: '50%',
            marginTop: '20px',
            boxSizing: 'border-box'
        }
    });

    // 🌟 1. 输入框包裹层 (右侧采用与官方完全一致的 5px CSS 边框扁平倒三角)
    const selectArrow = createEl('span', {
        className: 'preset-arrow',
        style: {
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #999',
            pointerEvents: 'none',
            transition: 'transform 0.2s ease'
        }
    });

    const inputBox = createInput({
        className: 'multiselect__input',
        placeholder: UI_TEXT.presetDropdownPlaceholder,
        attrs: {
            autocomplete: 'off',
            type: 'text'
        },
        style: {
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '13px',
            textAlign: 'center',
            padding: '0 30px 0 10px',
            margin: '0',
            cursor: 'text'
        }
    });

    const tagsWrap = createEl('div', {
        className: 'multiselect__tags',
        style: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '36px',
            boxSizing: 'border-box',
            background: '#1e2124',
            borderRadius: '4px',
            padding: '0',
            cursor: 'pointer'
        },
        children: [inputBox, selectArrow]
    });

    // 🌟 2. 悬浮下拉列表包裹层 (宽度 100% 紧贴输入框正下方)
    const contentWrapper = createEl('div', {
        className: 'multiselect__content-wrapper',
        style: {
            position: 'absolute',
            top: '100%',
            left: '0',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: '#1e2124',
            border: '1px solid #333',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: '1000',
            boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
            display: 'none'
        }
    });

    const contentList = createEl('ul', {
        className: 'multiselect__content',
        style: {
            display: 'inline-block',
            width: '100%',
            margin: '0',
            padding: '0',
            listStyle: 'none'
        }
    });
    contentWrapper.appendChild(contentList);

    // 状态控制辅助函数
    const openDropdown = () => {
        container.classList.add('multiselect--active');
        contentWrapper.style.display = 'block';
        selectArrow.style.transform = 'translateY(-50%) rotate(180deg)';
    };

    const closeDropdown = () => {
        container.classList.remove('multiselect--active');
        contentWrapper.style.display = 'none';
        selectArrow.style.transform = 'translateY(-50%) rotate(0deg)';
        if (!inputBox.value.trim()) {
            inputBox.style.textAlign = 'center';
            inputBox.style.padding = '0 30px 0 10px';
        }
    };

    // 动态生成下拉列表项
    function populateDropdown(filter = '') {
        contentList.innerHTML = '';
        const presets = GM_getValue('saveStats') || presetProxy.saveStats || [];
        const filtered = presets.filter((option: any) =>
            option.name && option.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            const emptyEl = createEl('li', {
                className: 'multiselect__element',
                children: [
                    createEl('span', {
                        className: 'multiselect__option',
                        style: { color: '#666', fontStyle: 'italic', cursor: 'default' },
                        text: '無匹配預設'
                    })
                ]
            });
            contentList.appendChild(emptyEl);
            return;
        }

        filtered.forEach((option: any) => {
            const deleteButton = createButton({
                text: '×',
                style: {
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 4px',
                    lineHeight: '1'
                },
                onClick: (event) => {
                    event.stopPropagation();
                    presetProxy.saveStats = presetProxy.saveStats.filter((a: any) => a.name !== option.name);
                    GM_setValue('saveStats', presetProxy.saveStats);
                    populateDropdown(inputBox.value);
                }
            });
            deleteButton.addEventListener('mouseenter', () => { deleteButton.style.color = '#ff6666'; });
            deleteButton.addEventListener('mouseleave', () => { deleteButton.style.color = '#888'; });

            const optionSpan = createEl('span', {
                className: 'multiselect__option',
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                },
                children: [
                    createEl('span', { text: option.name }),
                    deleteButton
                ]
            });

            // 选项高亮效果 (匹配官方 hover 类名)
            optionSpan.addEventListener('mouseenter', () => {
                optionSpan.classList.add('multiselect__option--highlight');
            });
            optionSpan.addEventListener('mouseleave', () => {
                optionSpan.classList.remove('multiselect__option--highlight');
            });

            // 预设点击还原事件
            optionSpan.addEventListener('click', () => {
                const rawQuery = option.query;
                const queryList = Array.isArray(rawQuery)
                    ? JSON.parse(JSON.stringify(rawQuery))
                    : [JSON.parse(JSON.stringify(rawQuery))];

                const store = (unsafeWindow as any)?.app?.$store;
                const applyRestore = () => {
                    const stats = (unsafeWindow as any)?.app?.query?.query?.stats;
                    if (stats && Array.isArray(stats)) {
                        // 🌟 清空页面已有全部组，完全整套还原为保存时的组！
                        stats.splice(0, stats.length, ...queryList);
                    }
                };

                try {
                    if (store && typeof store._withCommit === 'function') {
                        store._withCommit(applyRestore);
                    } else {
                        applyRestore();
                    }
                } catch (e) {
                    console.error("[預設模組] 還原預設異常:", e);
                }

                inputBox.value = '';
                closeDropdown();
            });

            const elementLi = createEl('li', {
                className: 'multiselect__element',
                children: [optionSpan]
            });

            contentList.appendChild(elementLi);
        });
    }

    populateDropdown();

    // 暴露外部刷新
    (window as any).refreshMainPresetDropdown = () => {
        populateDropdown(inputBox.value);
    };

    // 输入框事件监听与对齐交互 (聚焦/输入时靠左，失焦空值时恢复居中)
    inputBox.addEventListener('focus', () => {
        inputBox.style.textAlign = 'left';
        inputBox.style.padding = '0 30px 0 14px';
        openDropdown();
    });

    inputBox.addEventListener('blur', () => {
        if (!inputBox.value.trim()) {
            inputBox.style.textAlign = 'center';
            inputBox.style.padding = '0 30px 0 10px';
        }
    });

    inputBox.addEventListener('input', () => {
        inputBox.style.textAlign = 'left';
        inputBox.style.padding = '0 30px 0 14px';
        populateDropdown(inputBox.value);
        openDropdown();
    });

    tagsWrap.addEventListener('click', () => {
        populateDropdown(inputBox.value);
        openDropdown();
        inputBox.focus();
    });

    // 箭头点击切换展开与收起
    selectArrow.addEventListener('click', (event) => {
        event.stopPropagation();
        if (contentWrapper.style.display === 'block') {
            closeDropdown();
        } else {
            populateDropdown(inputBox.value);
            openDropdown();
        }
    });

    // 点击外部区域自动关闭
    document.addEventListener('click', (event: any) => {
        if (!container.contains(event.target)) {
            closeDropdown();
        }
    });

    container.appendChild(tagsWrap);
    container.appendChild(contentWrapper);

    statsDiv.appendChild(container);
}

/**
 * 🌟 2. 初始化保存预设模态弹窗 (Modal)
 */
export function initModel() {
    if (document.querySelector('#save-modal')) return;

    // 🌟 1. 标题
    const title = createEl('h4', {
        text: UI_TEXT.modalTitle,
        style: { marginTop: '0', marginBottom: '12px', color: '#e2c08d' }
    });

    // 🌟 2. 输入框
    const input = createInput({
        placeholder: UI_TEXT.modalInputPlaceholder,
        attrs: { 'data-bind': 'inputName' },
        style: {
            flex: '1',
            padding: '8px',
            background: '#181a1b',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px'
        },
        onInput: (val) => {
            presetProxy.inputName = val;
        }
    });

    // 🌟 3. 保存按钮
    const saveButton = createButton({
        text: UI_TEXT.btnSave,
        style: {
            padding: '6px 14px',
            backgroundColor: '#b08436',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
        },
        onClick: () => {
            const val = input.value.trim();
            if (!val) {
                alert(UI_TEXT.promptEnterName);
                return;
            }
            executeSavePreset(val, false);
        }
    });

    // 🌟 4. 新建预设输入栏 (输入框 + 保存按钮 并排)
    const newSection = createEl('div', {
        style: {
            display: 'flex',
            gap: '8px',
            marginBottom: '12px'
        },
        children: [input, saveButton]
    });

    // 🌟 5. 已保存列表标题
    const listLabel = createEl('div', {
        text: '已保存的預設配置 (可覆蓋或刪除):',
        style: {
            fontSize: '12px',
            color: '#aaa',
            marginBottom: '6px'
        }
    });

    // 🌟 6. 已保存列表容器
    const listContainer = createEl('div', {
        style: {
            maxHeight: '160px',
            overflowY: 'auto',
            backgroundColor: '#181a1b',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '4px',
            marginBottom: '12px'
        }
    });

    // 🌟 7. 取消关闭按钮
    const cancelButton = createButton({
        text: UI_TEXT.btnCancel,
        style: {
            padding: '6px 14px',
            backgroundColor: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        },
        onClick: () => {
            modal.style.display = 'none';
        }
    });

    const buttonContainer = createEl('div', {
        style: {
            display: 'flex',
            justifyContent: 'flex-end'
        },
        children: [cancelButton]
    });

    // 🌟 8. 装配弹窗主容器
    const modal = createEl('div', {
        id: 'save-modal',
        style: {
            display: 'none',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#26292d',
            color: '#e0e0e0',
            padding: '20px',
            border: '1px solid #444',
            borderRadius: '6px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.8)',
            minWidth: '380px',
            maxWidth: '460px',
            zIndex: '1001'
        },
        children: [title, newSection, listLabel, listContainer, buttonContainer]
    });

    document.body.appendChild(modal);

    // 核心保存逻辑 (整套词缀方案完整全量保存)
    function executeSavePreset(name: string, isOverwrite: boolean) {
        const allStatsArray = (unsafeWindow as any)?.app?.query?.query?.stats;
        const newData = {
            name: name,
            query: JSON.parse(JSON.stringify(allStatsArray))
        };

        const curList = GM_getValue('saveStats') || presetProxy.saveStats || [];
        const existingIndex = curList.findIndex((a: any) => a.name === name);

        if (existingIndex !== -1) {
            curList[existingIndex] = JSON.parse(JSON.stringify(newData));
        } else {
            curList.push(JSON.parse(JSON.stringify(newData)));
        }

        presetProxy.saveStats = curList;
        GM_setValue('saveStats', JSON.parse(JSON.stringify(curList)));

        if (typeof (window as any).refreshMainPresetDropdown === 'function') {
            (window as any).refreshMainPresetDropdown();
        }

        renderModalPresetList();
        input.value = '';
        if (!isOverwrite) {
            modal.style.display = 'none';
        }
    }

    // 渲染弹窗内预设列表 (支持一键覆盖与删除)
    function renderModalPresetList() {
        listContainer.innerHTML = '';
        const presets = GM_getValue('saveStats') || presetProxy.saveStats || [];
        if (presets.length === 0) {
            const emptyTip = createEl('div', {
                text: '暫無已保存預設',
                style: {
                    color: '#666',
                    fontSize: '12px',
                    padding: '10px',
                    textAlign: 'center'
                }
            });
            listContainer.appendChild(emptyTip);
            return;
        }

        presets.forEach((p: any) => {
            const nameText = createEl('span', {
                text: p.name,
                style: {
                    color: '#e2c08d',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    flex: '1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }
            });

            // ⚡ 一键覆盖按钮
            const overwriteBtn = createButton({
                text: '⚡ 覆蓋此預設',
                style: {
                    padding: '3px 8px',
                    backgroundColor: '#995511',
                    color: '#fff',
                    border: '1px solid #c9731e',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                },
                onClick: () => {
                    executeSavePreset(p.name, true);
                }
            });
            overwriteBtn.title = '用當前詞綴組覆蓋更新此預設';

            // × 删除按钮
            const delBtn = createButton({
                text: '×',
                style: {
                    padding: '2px 7px',
                    backgroundColor: '#442222',
                    color: '#ff6666',
                    border: '1px solid #663333',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                onClick: () => {
                    if (confirm(`確認刪除預設「${p.name}」嗎？`)) {
                        const curList = GM_getValue('saveStats') || presetProxy.saveStats || [];
                        presetProxy.saveStats = curList.filter((a: any) => a.name !== p.name);
                        GM_setValue('saveStats', JSON.parse(JSON.stringify(presetProxy.saveStats)));
                        if (typeof (window as any).refreshMainPresetDropdown === 'function') {
                            (window as any).refreshMainPresetDropdown();
                        }
                        renderModalPresetList();
                    }
                }
            });
            delBtn.title = '刪除此預設';

            const actions = createEl('div', {
                style: { display: 'flex', gap: '6px', alignItems: 'center' },
                children: [overwriteBtn, delBtn]
            });

            const row = createEl('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    margin: '3px 0',
                    backgroundColor: '#1e2124',
                    border: '1px solid #2a2d30',
                    borderRadius: '4px'
                },
                children: [nameText, actions]
            });

            listContainer.appendChild(row);
        });
    }

    (modal as any).refreshList = () => {
        input.value = '';
        renderModalPresetList();
    };

    // 点击弹窗外部关闭弹窗
    window.addEventListener('click', (event: any) => {
        if (event.target !== modal && !modal.contains(event.target) && modal.style.display !== 'none') {
            modal.style.display = 'none';
        }
    });
}
