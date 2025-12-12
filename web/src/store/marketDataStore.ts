import { create } from "zustand";

interface IPMarketData {
    supply: number;
    currentPrice: number;
    reserve: number;
    marketCap: number;
}

interface MarketDataStore {
    ipData: Record<string, IPMarketData>;
    updateIPData: (ipId: string, data: Partial<IPMarketData>) => void;
    getIPData: (ipId: string) => IPMarketData | null;
}

export const useMarketDataStore = create<MarketDataStore>((set, get) => ({
    ipData: {},
    updateIPData: (ipId, data) =>
        set(state => ({
            ipData: {
                ...state.ipData,
                [ipId]: {
                    ...state.ipData[ipId],
                    ...data,
                } as IPMarketData,
            },
        })),
    getIPData: ipId => get().ipData[ipId] || null,
}));

