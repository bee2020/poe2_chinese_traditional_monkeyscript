// @ts-nocheck
// 🌟 完整稳定版 ajaxHooker (支持 XHR 与 Fetch 拦截与响应改写)
export const ajaxHooker: any = function() {
    'use strict';
    const version = '1.4.3-patched';
    const hookInst = {
        hookFns: [],
        filters: []
    };
    const win = window.unsafeWindow || document.defaultView || window;
    let winAh = win.__ajaxHooker;
    const resProto = win.Response.prototype;
    const xhrResponses = ['response', 'responseText', 'responseXML'];
    const fetchResponses = ['arrayBuffer', 'blob', 'formData', 'json', 'text'];
    const fetchInitProps = ['method', 'headers', 'body', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'integrity', 'keepalive', 'signal', 'priority'];
    const xhrAsyncEvents = ['readystatechange', 'load', 'loadend'];
    const getType = ({}).toString.call.bind(({}).toString);
    const getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
    const emptyFn = () => {};
    const errorFn = (e: any) => console.error(e);
    function isThenable(obj: any) {
        return obj && ['object', 'function'].includes(typeof obj) && typeof obj.then === 'function';
    }
    function catchError(fn: any, ...args: any[]) {
        try {
            const result = fn(...args);
            if (isThenable(result))
                return result.then(null, errorFn);
            return result;
        } catch (err) {
            console.error(err);
        }
    }
    function defineProp(obj: any, prop: any, getter: any, setter?: any) {
        Object.defineProperty(obj, prop, {
            configurable: true,
            enumerable: true,
            get: getter,
            set: setter
        });
    }
    function readonly(obj: any, prop: any, value=obj[prop]) {
        defineProp(obj, prop, () => value, emptyFn);
    }
    function writable(obj: any, prop: any, value=obj[prop]) {
        Object.defineProperty(obj, prop, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: value
        });
    }
    function parseHeaders(obj: any) {
        const headers: any = {};
        switch (getType(obj)) {
            case '[object String]':
                for (const line of obj.trim().split(/[\r\n]+/)) {
                    const [header,value] = line.split(/\s*:\s*/);
                    if (!header)
                        break;
                    const lheader = header.toLowerCase();
                    headers[lheader] = lheader in headers ? `${headers[lheader]}, ${value}` : value;
                }
                break;
            case '[object Headers]':
                for (const [key,val] of obj) {
                    headers[key] = val;
                }
                break;
            case '[object Object]':
                return {
                    ...obj
                };
        }
        return headers;
    }
    function stopImmediatePropagation(this: any) {
        this.ajaxHooker_isStopped = true;
    }
    class SyncThenable {
        then(fn: any) {
            fn && fn();
            return new SyncThenable();
        }
    }
    class AHRequest {
        request: any;
        requestClone: any;
        constructor(request: any) {
            this.request = request;
            this.requestClone = {
                ...this.request
            };
        }
        shouldFilter(filters: any[]) {
            const {type, url, method, async} = this.request;
            return filters.length && !filters.find(obj => {
                switch (true) {
                    case obj.type && obj.type !== type:
                    case getType(obj.url) === '[object String]' && !url.includes(obj.url):
                    case getType(obj.url) === '[object RegExp]' && !obj.url.test(url):
                    case obj.method && obj.method.toUpperCase() !== method.toUpperCase():
                    case 'async' in obj && obj.async !== async:
                        return false;
                }
                return true;
            });
        }
        waitForRequestKeys() {
            const requestKeys = ['url', 'method', 'abort', 'headers', 'data'];
            if (!this.request.async) {
                win.__ajaxHooker.hookInsts.forEach(({hookFns, filters}: any) => {
                    if (this.shouldFilter(filters))
                        return;
                    hookFns.forEach((fn: any) => {
                        if (getType(fn) === '[object Function]')
                            catchError(fn, this.request);
                    });
                    requestKeys.forEach(key => {
                        if (isThenable(this.request[key]))
                            this.request[key] = this.requestClone[key];
                    });
                });
                return new SyncThenable();
            }
            const promises: any[] = [];
            win.__ajaxHooker.hookInsts.forEach(({hookFns, filters}: any) => {
                if (this.shouldFilter(filters))
                    return;
                promises.push(Promise.all(hookFns.map((fn: any) => catchError(fn, this.request))).then(() => Promise.all(requestKeys.map(key => Promise.resolve(this.request[key]).then(val => this.request[key] = val, () => this.request[key] = this.requestClone[key])))));
            });
            return Promise.all(promises);
        }
        waitForResponseKeys(response: any) {
            const responseKeys = this.request.type === 'xhr' ? xhrResponses : fetchResponses;
            if (!this.request.async) {
                if (getType(this.request.response) === '[object Function]') {
                    catchError(this.request.response, response);
                    responseKeys.forEach(key => {
                        if ('get' in getDescriptor(response, key) || isThenable(response[key])) {
                            delete response[key];
                        }
                    });
                }
                return new SyncThenable();
            }
            return Promise.resolve(catchError(this.request.response, response)).then(() => Promise.all(responseKeys.map(key => {
                const descriptor = getDescriptor(response, key);
                if (descriptor && 'value' in descriptor) {
                    return Promise.resolve(descriptor.value).then(val => response[key] = val, () => delete response[key]);
                } else {
                    delete response[key];
                }
            })));
        }
    }
    const proxyHandler = {
        get(target: any, prop: any) {
            const descriptor = getDescriptor(target, prop);
            if (descriptor && !descriptor.configurable && !descriptor.writable && !descriptor.get)
                return target[prop];
            const ah = target.__ajaxHooker;
            if (ah && ah.proxyProps) {
                if (prop in ah.proxyProps) {
                    const pDescriptor = ah.proxyProps[prop];
                    if ('get' in pDescriptor)
                        return pDescriptor.get();
                    if (typeof pDescriptor.value === 'function')
                        return pDescriptor.value.bind(ah);
                    return pDescriptor.value;
                }
                if (typeof target[prop] === 'function')
                    return target[prop].bind(target);
            }
            return target[prop];
        },
        set(target: any, prop: any, value: any) {
            const descriptor = getDescriptor(target, prop);
            if (descriptor && !descriptor.configurable && !descriptor.writable && !descriptor.set)
                return true;
            const ah = target.__ajaxHooker;
            if (ah && ah.proxyProps && prop in ah.proxyProps) {
                const pDescriptor = ah.proxyProps[prop];
                pDescriptor.set ? pDescriptor.set(value) : (pDescriptor.value = value);
            } else {
                target[prop] = value;
            }
            return true;
        }
    };
    class XhrHooker {
        originalXhr: any;
        proxyXhr: any;
        resThenable: any;
        proxyProps: any;
        proxyEvents: any;
        request: any;
        openArgs: any;
        constructor(xhr: any) {
            const ah: any = this;
            Object.assign(ah, {
                originalXhr: xhr,
                proxyXhr: new Proxy(xhr, proxyHandler),
                resThenable: new SyncThenable(),
                proxyProps: {},
                proxyEvents: {}
            });
            xhr.addEventListener('readystatechange', (e: any) => {
                if (ah.proxyXhr.readyState === 4 && ah.request && typeof ah.request.response === 'function') {
                    const response: any = {
                        finalUrl: ah.proxyXhr.responseURL,
                        status: ah.proxyXhr.status,
                        responseHeaders: parseHeaders(ah.proxyXhr.getAllResponseHeaders())
                    };
                    const tempValues: any = {};
                    for (const key of xhrResponses) {
                        try {
                            tempValues[key] = ah.originalXhr[key];
                        } catch (err) {}
                        defineProp(response, key, () => {
                            return response[key] = tempValues[key];
                        }, (val: any) => {
                            delete response[key];
                            response[key] = val;
                        });
                    }
                    ah.resThenable = new AHRequest(ah.request).waitForResponseKeys(response).then(() => {
                        for (const key of xhrResponses) {
                            ah.proxyProps[key] = {
                                get: () => {
                                    if (!(key in response))
                                        response[key] = tempValues[key];
                                    return response[key];
                                }
                            };
                        }
                    });
                }
                ah.dispatchEvent(e);
            });
            xhr.addEventListener('load', (e: any) => ah.dispatchEvent(e));
            xhr.addEventListener('loadend', (e: any) => ah.dispatchEvent(e));
            for (const evt of xhrAsyncEvents) {
                const onEvt = 'on' + evt;
                ah.proxyProps[onEvt] = {
                    get: () => ah.proxyEvents[onEvt] || null,
                    set: (val: any) => ah.addEvent(onEvt, val)
                };
            }
            for (const method of ['setRequestHeader', 'addEventListener', 'removeEventListener', 'open', 'send']) {
                ah.proxyProps[method] = {
                    value: ah[method]
                };
            }
        }
        toJSON() {}
        addEvent(type: string, event: any) {
            if (type.startsWith('on')) {
                this.proxyEvents[type] = typeof event === 'function' ? event : null;
            } else {
                if (typeof event === 'object' && event !== null)
                    event = event.handleEvent;
                if (typeof event !== 'function')
                    return;
                this.proxyEvents[type] = this.proxyEvents[type] || new Set();
                this.proxyEvents[type].add(event);
            }
        }
        removeEvent(type: string, event: any) {
            if (type.startsWith('on')) {
                this.proxyEvents[type] = null;
            } else {
                if (typeof event === 'object' && event !== null)
                    event = event.handleEvent;
                this.proxyEvents[type] && this.proxyEvents[type].delete(event);
            }
        }
        dispatchEvent(e: any) {
            e.stopImmediatePropagation = stopImmediatePropagation;
            defineProp(e, 'target', () => this.proxyXhr);
            defineProp(e, 'currentTarget', () => this.proxyXhr);
            this.proxyEvents[e.type] && this.proxyEvents[e.type].forEach((fn: any) => {
                this.resThenable.then(() => !e.ajaxHooker_isStopped && fn.call(this.proxyXhr, e));
            });
            if (e.ajaxHooker_isStopped)
                return;
            const onEvent = this.proxyEvents['on' + e.type];
            onEvent && this.resThenable.then(onEvent.bind(this.proxyXhr, e));
        }
        setRequestHeader(header: string, value: string) {
            this.originalXhr.setRequestHeader(header, value);
            if (!this.request)
                return;
            const headers = this.request.headers;
            headers[header] = header in headers ? `${headers[header]}, ${value}` : value;
        }
        addEventListener(...args: any[]) {
            if (xhrAsyncEvents.includes(args[0])) {
                this.addEvent(args[0], args[1]);
            } else {
                this.originalXhr.addEventListener(...args);
            }
        }
        removeEventListener(...args: any[]) {
            if (xhrAsyncEvents.includes(args[0])) {
                this.removeEvent(args[0], args[1]);
            } else {
                this.originalXhr.removeEventListener(...args);
            }
        }
        open(method: string, url: any, async=true, ...args: any[]) {
            this.request = {
                type: 'xhr',
                url: url.toString(),
                method: method.toUpperCase(),
                abort: false,
                headers: {},
                data: null,
                response: null,
                async: !!async
            };
            this.openArgs = args;
            this.resThenable = new SyncThenable();
            ['responseURL', 'readyState', 'status', 'statusText', ...xhrResponses].forEach(key => {
                delete this.proxyProps[key];
            });
            return this.originalXhr.open(method, url, async, ...args);
        }
        send(data: any) {
            const ah: any = this;
            const xhr = ah.originalXhr;
            const request = ah.request;
            if (!request)
                return xhr.send(data);
            request.data = data;
            new AHRequest(request).waitForRequestKeys().then(() => {
                if (request.abort) {
                    if (typeof request.response === 'function') {
                        Object.assign(ah.proxyProps, {
                            responseURL: {
                                value: request.url
                            },
                            readyState: {
                                value: 4
                            },
                            status: {
                                value: 200
                            },
                            statusText: {
                                value: 'OK'
                            }
                        });
                        xhrAsyncEvents.forEach(evt => xhr.dispatchEvent(new Event(evt)));
                    }
                } else {
                    xhr.open(request.method, request.url, request.async, ...ah.openArgs);
                    for (const header in request.headers) {
                        xhr.setRequestHeader(header, request.headers[header]);
                    }
                    xhr.send(request.data);
                }
            });
        }
    }
    function fakeXHR(this: any) {
        const xhr = new winAh.realXHR();
        if ('__ajaxHooker' in xhr)
            console.warn('检测到不同版本的ajaxHooker，可能发生冲突！');
        xhr.__ajaxHooker = new XhrHooker(xhr);
        return xhr.__ajaxHooker.proxyXhr;
    }
    fakeXHR.prototype = win.XMLHttpRequest.prototype;
    Object.keys(win.XMLHttpRequest).forEach(key => (fakeXHR as any)[key] = (win.XMLHttpRequest as any)[key]);

    // 桥接 Fetch responseText
    function bridgeResponseText(response: any) {
        Object.defineProperty(response, 'responseText', {
            configurable: true,
            enumerable: true,
            get() {
                if ('text' in response) return response.text;
                if ('json' in response) {
                    if (typeof response.json === 'object') {
                        try {
                            return JSON.stringify(response.json);
                        } catch (e) {
                            return '';
                        }
                    }
                    return response.json;
                }
                return undefined;
            },
            set(val) {
                if ('text' in response) {
                    response.text = val;
                }
                if ('json' in response) {
                    try {
                        response.json = JSON.parse(val);
                    } catch (e) {
                        response.json = val;
                    }
                }
            }
        });
    }

    function fakeFetch(url: any, options: any={}) {
        if (!url)
            return winAh.realFetch.call(win, url, options);
        return new Promise(async (resolve, reject) => {
            const init: any = {};
            if (getType(url) === '[object Request]') {
                for (const prop of fetchInitProps)
                    init[prop] = url[prop];
                if (url.body)
                    init.body = await url.arrayBuffer();
                url = url.url;
            }
            url = url.toString();
            Object.assign(init, options);
            init.method = init.method || 'GET';
            init.headers = init.headers || {};
            const request: any = {
                type: 'fetch',
                url: url,
                method: init.method.toUpperCase(),
                abort: false,
                headers: parseHeaders(init.headers),
                data: init.body,
                response: null,
                async: true
            };
            const req = new AHRequest(request);
            await req.waitForRequestKeys();
            if (request.abort) {
                if (typeof request.response === 'function') {
                    const response: any = {
                        finalUrl: request.url,
                        status: 200,
                        responseHeaders: {}
                    };
                    bridgeResponseText(response);
                    await req.waitForResponseKeys(response);
                    const key = fetchResponses.find(k => k in response);
                    let val = response[key!];
                    if (key === 'json' && typeof val === 'object') {
                        val = catchError(JSON.stringify.bind(JSON), val);
                    }
                    const res = new Response(val, {
                        status: 200,
                        statusText: 'OK'
                    });
                    defineProp(res, 'type', () => 'basic');
                    defineProp(res, 'url', () => request.url);
                    resolve(res);
                } else {
                    reject(new DOMException('aborted', 'AbortError'));
                }
                return;
            }
            init.method = request.method;
            init.headers = request.headers;
            init.body = request.data;
            winAh.realFetch.call(win, request.url, init).then((res: any) => {
                if (typeof request.response === 'function') {
                    const response: any = {
                        finalUrl: res.url,
                        status: res.status,
                        responseHeaders: parseHeaders(res.headers)
                    };
                    bridgeResponseText(response);
                    fetchResponses.forEach(key => res[key] = function(this: any) {
                        if (key in response)
                            return Promise.resolve(response[key]);
                        return resProto[key].call(this).then((val: any) => {
                            response[key] = val;
                            return req.waitForResponseKeys(response).then(() => key in response ? response[key] : val);
                        });
                    });
                }
                resolve(res);
            }, reject);
        });
    }
    function fakeFetchClone(this: any) {
        const descriptors = Object.getOwnPropertyDescriptors(this);
        const res = winAh.realFetchClone.call(this);
        Object.defineProperties(res, descriptors);
        return res;
    }
    winAh = win.__ajaxHooker = winAh || {
        version,
        fakeXHR,
        fakeFetch,
        fakeFetchClone,
        realXHR: win.XMLHttpRequest,
        realFetch: win.fetch,
        realFetchClone: resProto.clone,
        hookInsts: new Set()
    };
    if (winAh.version !== version)
        console.warn('检测到不同版本的ajaxHooker，可能发生冲突！');
    win.XMLHttpRequest = winAh.fakeXHR;
    win.fetch = winAh.fakeFetch;
    resProto.clone = winAh.fakeFetchClone;
    winAh.hookInsts.add(hookInst);
    return {
        hook: (fn: any) => hookInst.hookFns.push(fn),
        filter: (arr: any[]) => {
            if (Array.isArray(arr))
                hookInst.filters = arr;
        },
        protect: () => {
            readonly(win, 'XMLHttpRequest', winAh.fakeXHR);
            readonly(win, 'fetch', winAh.fakeFetch);
            readonly(resProto, 'clone', winAh.fakeFetchClone);
        },
        unhook: () => {
            winAh.hookInsts.delete(hookInst);
            if (!winAh.hookInsts.size) {
                writable(win, 'XMLHttpRequest', winAh.realXHR);
                writable(win, 'fetch', winAh.realFetch);
                writable(resProto, 'clone', winAh.realFetchClone);
                delete win.__ajaxHooker;
            }
        }
    };
}();
