import { create } from "zustand";
import { TokenCardProps } from "@/types/token";

interface WatchlistStore {
    watchlist: Record<string, TokenCardProps>;
    isLoaded: boolean;
    loadWatchlist: () => Promise<void>;
    toggleWatchlist: (token: TokenCardProps) => Promise<void>;
    removeFromWatchlist: (id: string) => Promise<void>;
    updatePricing: (
        ipId: string,
        pricing: {
            marketCap: number;
            currentPrice: number;
            supply: number;
            reserve: number;
        },
    ) => void;
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
    watchlist: {},
    isLoaded: false,

    loadWatchlist: async () => {
        if (get().isLoaded) return;
        try {
            const { getWatchlistTokens } = await import("@/lib/watchlistDB");
            const tokens = await getWatchlistTokens();
            const map = tokens.reduce<Record<string, TokenCardProps>>((acc, token) => {
                acc[token.id] = token;
                return acc;
            }, {});
            set({ watchlist: map, isLoaded: true });
        } catch (error) {
            console.error("Failed to load watchlist", error);
            set({ isLoaded: true });
        }
    },

    toggleWatchlist: async token => {
        const { watchlist } = get();
        const exists = Boolean(watchlist[token.id]);

        try {
            const { saveTokenToWatchlist, removeTokenFromWatchlist } =
                await import("@/lib/watchlistDB");
            if (exists) {
                await removeTokenFromWatchlist(token.id);
                const updated = { ...watchlist };
                delete updated[token.id];
                set({ watchlist: updated });
            } else {
                await saveTokenToWatchlist(token);
                set({ watchlist: { ...watchlist, [token.id]: token } });
            }
        } catch (error) {
            console.error("Failed to toggle watchlist", error);
        }
    },

    removeFromWatchlist: async id => {
        const { watchlist } = get();
        if (!watchlist[id]) return;

        try {
            const { removeTokenFromWatchlist } = await import("@/lib/watchlistDB");
            await removeTokenFromWatchlist(id);
            const updated = { ...watchlist };
            delete updated[id];
            set({ watchlist: updated });
        } catch (error) {
            console.error("Failed to remove from watchlist", error);
        }
    },

    // Update only pricing data in real-time (don't save to IDB)
    updatePricing: (ipId, pricing) => {
        const { watchlist } = get();
        const token = watchlist[ipId];

        if (!token) return; // Token not in watchlist

        set({
            watchlist: {
                ...watchlist,
                [ipId]: {
                    ...token,
                    marketCap: pricing.marketCap,
                    currentPrice: pricing.currentPrice,
                    supply: pricing.supply,
                },
            },
        });
    },
}));
