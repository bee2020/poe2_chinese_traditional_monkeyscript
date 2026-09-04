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
        if (modal) modal.style.display = 'block';
    }, 100);
}

/**
 * 🌟 1. 初始化预设下拉搜索与应用组件 (Dropdown)
 */
export function initSlectMy() {
    const targetSelect = document.querySelector('.multiselect.filter-select.filter-group-select');
    const statsDiv = targetSelect?.closest('span')?.closest('div');
    if (!statsDiv) return;

    if (statsDiv.querySelector('.preset-dropdown-container')) return;

    // 🌟 声明式创建搜索输入框
    const inputBox = createInput({
        className: 'multiselect',
        placeholder: UI_TEXT.presetDropdownPlaceholder,
        style: {
            width: '50%',
            background: '#1e2124',
            textAlign: 'center',
            marginLeft: '50%',
            marginTop: '20px',
            color: 'white',
            padding: '5px',
            border: 'none',
            borderRadius: '4px'
        }
    });

    // 🌟 声明式创建下拉列表容器
    const dropdown = createEl('div', {
        className: 'dropdown',
        style: {
            display: 'none',
            backgroundColor: '#1e2124',
            border: '1px solid #ccc',
            maxHeight: '150px',
            overflowY: 'auto',
            width: '50%',
            marginLeft: '50%',
            zIndex: '1000'
        }
    });

    // 动态生成下拉列表项
    function populateDropdown(filter = '') {
        dropdown.innerHTML = '';
        presetProxy.saveStats.forEach(option => {
            if (option.name && option.name.toLowerCase().includes(filter.toLowerCase())) {
                const deleteButton = createButton({
                    text: '×',
                    style: {
                        background: 'none',
                        border: 'none',
                        color: 'red',
                        cursor: 'pointer',
                        fontSize: '16px'
                    },
                    onClick: (event) => {
                        event.stopPropagation();
                        presetProxy.saveStats = presetProxy.saveStats.filter(a => a.name !== option.name);
                        GM_setValue('saveStats', presetProxy.saveStats);
                        populateDropdown(inputBox.value);
                    }
                });

                const item = createEl('div', {
                    style: {
                        padding: '10px',
                        cursor: 'pointer',
                        color: 'white'
                    },
                    children: [option.name, deleteButton],
                    on: {
                        click: () => {
                            unsafeWindow?.app?.$store?.commit("pushStatGroup", JSON.parse(JSON.stringify(option.query)));
                            setTimeout(() => {
                                dropdown.style.display = 'none';
                            }, 100);
                        }
                    }
                });

                dropdown.appendChild(item);
            }
        });
    }

    populateDropdown();

    // 输入框事件监听
    inputBox.addEventListener('input', () => {
        populateDropdown(inputBox.value);
        dropdown.style.display = 'block';
    });

    // 点击页面其他区域时隐藏下拉列表
    document.addEventListener('click', (event: any) => {
        if (!dropdown.contains(event.target) && event.target !== inputBox) {
            dropdown.style.display = 'none';
        } else if (event.target === inputBox) {
            populateDropdown(inputBox.value);
            dropdown.style.display = 'block';
        }
    });

    const container = createEl('div', {
        className: 'multiselect filter-select filter-group-select preset-dropdown-container',
        children: [inputBox, dropdown]
    });

    statsDiv.appendChild(container);
}

/**
 * 🌟 2. 初始化保存预设模态弹窗 (Modal)
 */
export function initModel() {
    if (document.querySelector('#save-modal')) return;

    // 🌟 声明式创建标题
    const title = createEl('h4', {
        text: UI_TEXT.modalTitle,
        style: { marginTop: '0', marginBottom: '12px' }
    });

    // 🌟 声明式创建输入框
    const input = createInput({
        placeholder: UI_TEXT.modalInputPlaceholder,
        attrs: { 'data-bind': 'inputName' },
        style: {
            width: '100%',
            marginBottom: '12px',
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

    // 🌟 声明式创建保存与取消按钮
    const saveButton = createButton({
        text: UI_TEXT.btnSave,
        style: {
            marginRight: '10px',
            padding: '6px 14px',
            backgroundColor: '#b08436',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        },
        onClick: () => {
            const inputValue = input.value.trim();
            if (inputValue) {
                const existingIndex = presetProxy.saveStats.findIndex(a => a.name === inputValue);
                const currentStat = unsafeWindow?.app?.query?.query?.stats?.[presetProxy.statIndex];
                const newData = {
                    name: inputValue,
                    query: currentStat
                };

                if (existingIndex !== -1) {
                    presetProxy.saveStats[existingIndex] = JSON.parse(JSON.stringify(newData));
                } else {
                    presetProxy.saveStats.push(JSON.parse(JSON.stringify(newData)));
                }

                GM_setValue('saveStats', presetProxy.saveStats);
                modal.style.display = 'none';
            } else {
                alert(UI_TEXT.promptEnterName);
            }
        }
    });

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
        children: [saveButton, cancelButton]
    });

    // 🌟 声明式装配弹窗主容器
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
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            zIndex: '1001'
        },
        children: [title, input, buttonContainer]
    });

    document.body.appendChild(modal);

    // 点击弹窗外部关闭弹窗
    window.addEventListener('click', (event: any) => {
        if (event.target !== modal && !modal.contains(event.target) && modal.style.display !== 'none') {
            modal.style.display = 'none';
        }
    });
}
