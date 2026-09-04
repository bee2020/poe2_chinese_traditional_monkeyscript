/**
 * 🌟 通用类型安全 DOM 构造工具集 (DOM Helper)
 * 提供声明式构建 HTML 元素的能力，消除所有冗长的 document.createElement 及重复内联样式代码
 */

export interface ElementOptions<K extends keyof HTMLElementTagNameMap> {
    id?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration> | Record<string, string>;
    attrs?: Record<string, string>;
    text?: string;
    html?: string;
    children?: (HTMLElement | string | null | undefined)[];
    on?: Partial<{ [E in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[E]) => void }>;
}

/**
 * 🌟 核心通用 DOM 工厂函数
 */
export function createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: ElementOptions<K>
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (!options) return el;

    if (options.id) el.id = options.id;
    if (options.className) el.className = options.className;

    if (options.style) {
        Object.assign(el.style, options.style);
    }

    if (options.attrs) {
        for (const [key, val] of Object.entries(options.attrs)) {
            el.setAttribute(key, val);
        }
    }

    if (options.text !== undefined) {
        el.textContent = options.text;
    } else if (options.html !== undefined) {
        el.innerHTML = options.html;
    }

    if (options.children) {
        options.children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child) {
                el.appendChild(child);
            }
        });
    }

    if (options.on) {
        for (const [event, handler] of Object.entries(options.on)) {
            if (handler) {
                el.addEventListener(event, handler as EventListener);
            }
        }
    }

    return el;
}

/**
 * 🌟 下拉选单 (Select) 快捷构造器
 */
export interface SelectOptions {
    id?: string;
    className?: string;
    style?: Record<string, string>;
    options: { value: string; label: string; selected?: boolean }[];
    onChange?: (value: string, event: Event) => void;
}

export function createSelect(options: SelectOptions): HTMLSelectElement {
    const select = createEl('select', {
        id: options.id,
        className: options.className,
        style: options.style,
        on: options.onChange
            ? {
                change: (e) => {
                    const target = e.target as HTMLSelectElement;
                    options.onChange!(target.value, e);
                }
            }
            : undefined
    });

    options.options.forEach(opt => {
        const optionEl = createEl('option', {
            text: opt.label,
            attrs: { value: opt.value }
        });
        if (opt.selected) optionEl.selected = true;
        select.appendChild(optionEl);
    });

    return select;
}

/**
 * 🌟 按钮 (Button) 快捷构造器
 */
export interface ButtonOptions {
    id?: string;
    className?: string;
    text?: string;
    html?: string;
    style?: Record<string, string>;
    onClick?: (event: MouseEvent) => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
    return createEl('button', {
        id: options.id,
        className: options.className,
        text: options.text,
        html: options.html,
        style: options.style,
        on: options.onClick ? { click: options.onClick } : undefined
    });
}

/**
 * 🌟 输入框 (Input) 快捷构造器
 */
export interface InputOptions {
    id?: string;
    className?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    style?: Record<string, string>;
    attrs?: Record<string, string>;
    onInput?: (value: string, event: Event) => void;
    onClick?: (event: MouseEvent) => void;
}

export function createInput(options: InputOptions): HTMLInputElement {
    const attrs: Record<string, string> = {
        type: options.type || 'text',
        ...(options.attrs || {})
    };
    if (options.placeholder) attrs.placeholder = options.placeholder;

    const input = createEl('input', {
        id: options.id,
        className: options.className,
        style: options.style,
        attrs,
        on: {
            ...(options.onInput
                ? {
                    input: (e) => {
                        const target = e.target as HTMLInputElement;
                        options.onInput!(target.value, e);
                    }
                }
                : {}),
            ...(options.onClick ? { click: options.onClick } : {})
        }
    });

    if (options.value !== undefined) {
        input.value = options.value;
    }

    return input;
}
