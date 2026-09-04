export interface TradeItemEntry {
  name?: string;
  type: string;
  text?: string;
  disc?: string;
  flags?: { unique?: boolean };
  zh_tw?: {
    name?: string;
    type?: string;
    text?: string;
    source?: string;
  };
}

export interface TradeItemCategory {
  id: string;
  label: string;
  entries: TradeItemEntry[];
}

export interface TradeStatOption {
  id: number | string;
  text: string;
  twText?: string;
  zh_tw?: {
    text?: string;
    source?: string;
  };
}

export interface TradeStatEntry {
  id: string;
  text: string;
  type: string;
  twText?: string;
  option?: {
    options: TradeStatOption[];
  };
  zh_tw?: {
    text?: string;
    source?: string;
    option?: {
      options: TradeStatOption[];
    };
  };
}

export interface TradeStatCategory {
  id: string;
  label: string;
  entries: TradeStatEntry[];
}

export interface TradeStaticEntry {
  id: string;
  text?: string;
  image?: string;
  twText?: string;
  zh_tw?: {
    text?: string;
    source?: string;
  };
}

export interface TradeStaticCategory {
  id: string;
  label?: string;
  entries: TradeStaticEntry[];
}

export interface TradeFilterOption {
  id: string | number;
  text: string;
  zh_tw?: {
    text?: string;
  };
}

export interface TradeFilterItem {
  id: string;
  title?: string;
  option?: {
    options: TradeFilterOption[];
  };
  zh_tw?: {
    title?: string;
    option?: {
      options: TradeFilterOption[];
    };
  };
}

export interface TradeFilterCategory {
  id: string;
  title: string;
  filters: TradeFilterItem[];
  zh_tw?: {
    title?: string;
  };
}
