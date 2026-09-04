// ==UserScript==
// @name         POE2 trade 繁體優化增強版
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  POE2 官方交易市集繁體中文優化增強版油猴腳本 (基於官方權威雙源字典純動態構建)
// @author       Antigravity
// @match        https://www.pathofexile.com/trade2*
// @match        https://pathofexile.com/trade2*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// ==/UserScript==

import { dispatchResponseHook } from './parser';
import { ajaxHooker } from './core/ajaxHooker';
import { openSaveModal } from './ui/presetManager';
import { initWeightSelector } from './ui/weightSelector';
import { domTranslations, UI_TEXT } from './ui/uiMapping';
import { createEl } from './ui/domHelper';

(async () => {
    'use strict';
    const applyState: number = (GM_getValue('applyState') !== undefined ? GM_getValue('applyState') : 1) as number;
    const dataMap = GM_getValue('dataMap') ? GM_getValue('dataMap') : {};
    const whisperMap: Record<string, string> = {};

    // 🌟 最早时刻挂载网络拦截器 (在页面发起任何 fetch/xhr 请求前生效)
    ajaxHooker.hook((request: any) => {
        request.response = (res: any) => {
            dispatchResponseHook(request, res, applyState, dataMap, whisperMap);
        };
    });

    const checkInterval = 5000;

    function checkLocalStorage() {
        const hasAllCaches = localStorage.getItem('lscache-trade2data') &&
                             localStorage.getItem('lscache-trade2items') &&
                             localStorage.getItem('lscache-trade2stats') &&
                             localStorage.getItem('lscache-trade2filters');
        const span = document.querySelector('.applyTw a span');
        if (hasAllCaches && span) {
            try {
                const trade2filters = JSON.parse(localStorage.getItem('lscache-trade2filters') || '[]');
                if (Array.isArray(trade2filters) && trade2filters.some((a: any) => a.title === '交易過濾' || a.title === '交易过滤')) {
                    GM_setValue('applyState', 1);
                    span.textContent = '取消繁體化';
                } else if (Array.isArray(trade2filters) && trade2filters.length > 0) {
                    GM_setValue('applyState', 2);
                    span.textContent = '開啟繁體化';
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    setInterval(checkLocalStorage, checkInterval);

    window.addEventListener('load', function() {
        document.addEventListener('click', function(event: any) {
            if (event.target.closest('.applyTw')) {
                event.preventDefault();
                const currentApplyState = GM_getValue('applyState') || 1;
                GM_setValue('applyState', currentApplyState === 1 ? 2 : 1);
                localStorage.clear();
                location.reload();
            }
            if (event.target.closest('.applyAutoLg')) {
                event.preventDefault();
                putPromise('/api/trade2/settings', { "language": "" }).then(() => {
                    alert(UI_TEXT.autoLgSuccess);
                }).catch(() => {
                    alert(UI_TEXT.autoLgFailed);
                });
            }
            if (event.target.closest('.saveStat')) {
                const saveStatElements = document.querySelectorAll('.saveStat');
                const saveStatArray = Array.from(saveStatElements);
                const clickedElement = event.target.closest('.saveStat');
                const index = saveStatArray.indexOf(clickedElement);
                openSaveModal(index);
            }
        });

        // 查找顶部导航栏 ul 元素
        const tabList = document.querySelector('ul.nav.nav-tabs.account');
        if (!tabList) {
            return;
        }

        // 1. 创建繁体化开关按钮
        const applyLi = createEl('li', {
            className: 'applyTw',
            attrs: { role: 'presentation' },
            style: { float: 'right', height: '32px' },
            children: [
                createEl('a', {
                    attrs: { href: '#' },
                    html: `<span>${applyState === 1 ? UI_TEXT.btnCancelTw : UI_TEXT.btnEnableTw}</span>`
                })
            ]
        });
        tabList.appendChild(applyLi);

        // 2. 创建仓库定位快捷按钮
        const autoLgLi = createEl('li', {
            className: 'applyAutoLg',
            attrs: { role: 'presentation' },
            style: { float: 'right', height: '32px' },
            children: [
                createEl('a', {
                    attrs: { href: '#' },
                    html: `<span>${UI_TEXT.btnAutoLg}</span>`
                })
            ]
        });
        tabList.appendChild(autoLgLi);

        // 3. 🌟 初始化综合权重选项与词缀保存按钮
        initWeightSelector();
    });

    function ajax(url: string, method: string, data: any, successCallback?: (res: any) => void, errorCallback?: (err: any) => void) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (successCallback) successCallback(xhr.responseText);
                } else {
                    if (errorCallback) errorCallback(xhr.statusText);
                }
            }
        };

        if (method === 'POST' || method === 'PUT') {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    }

    function putPromise(url: string, data: any) {
        return new Promise((resolve, reject) => {
            ajax(url, 'PUT', data, (response) => resolve(response), (error) => reject(error));
        });
    }

    // 替换文本节点中的静态 UI 内容
    function replaceText(node: any) {
        let text = node.textContent;
        if (!text || !text.trim()) return;
        let modified = false;
        for (const [original, translated] of Object.entries(domTranslations)) {
            if (text.includes(original)) {
                text = text.replace(new RegExp(original, 'g'), translated);
                modified = true;
            }
        }
        if (modified) {
            node.textContent = text;
        }
    }

    // 递归替换元素节点中的文本内容 (严格跳过 SCRIPT, STYLE, TEMPLATE 等代码容器)
    function replaceTextInNode(node: any) {
        if (!node) return;
        const tag = node.tagName ? node.tagName.toUpperCase() : '';
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'NOSCRIPT') return;

        node.childNodes.forEach((child: any) => {
            if (child.nodeType === 3) {
                replaceText(child);
            } else if (child.nodeType === 1) {
                replaceTextInNode(child);
            }
        });
    }

    // 🌟 全生命周期实时 DOM 替换 (高性能 MutationObserver + 保底定时器)
    function initLiveDOMTranslator() {
        if (document.body) {
            replaceTextInNode(document.body);
        }

        const filterObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node: any) => {
                        replaceTextInNode(node);
                    });
                } else if (mutation.type === 'characterData' && mutation.target) {
                    replaceText(mutation.target);
                }
            }
        });

        const target = document.documentElement || document.body;
        if (target) {
            filterObserver.observe(target, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        setInterval(() => {
            if (document.body) {
                replaceTextInNode(document.body);
            }
        }, 2000);
    }

    if (applyState === 1) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initLiveDOMTranslator);
        } else {
            initLiveDOMTranslator();
        }
    }
})();
