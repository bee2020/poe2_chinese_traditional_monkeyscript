declare function GM_setValue(key: string, value: any): void;
declare function GM_getValue(key: string, defaultValue?: any): any;
declare function GM_deleteValue(key: string): void;
declare function GM_listValues(): string[];
declare function GM_addValueChangeListener(key: string, callback: (key: string, oldValue: any, newValue: any, remote: boolean) => void): number;
declare function GM_removeValueChangeListener(listenerId: number): void;
declare function GM_setClipboard(data: string, info?: string | { type?: string; minVersion?: string }): void;
declare function GM_xmlhttpRequest(details: any): any;

declare const unsafeWindow: Window & {
  app?: any;
  [key: string]: any;
};
