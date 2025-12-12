import { create } from "zustand";

interface PriceDataStore {
    price: number;
    lastUpdated: Date | null;
    setPrice: (price: number) => void;
    setLastUpdated: (lastUpdated: Date) => void;
}

export const usePriceDataStore = create<PriceDataStore>(set => ({
    price: 0,
    lastUpdated: null,
    setPrice: (price: number) => set({ price }),
    setLastUpdated: (lastUpdated: Date) => set({ lastUpdated }),
}));
