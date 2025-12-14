import { create } from "zustand";
import { TokenCardProps } from "@/types/token";

interface TokenStore {
    tokens: TokenCardProps[];
    filteredTokens: TokenCardProps[];
    searchQuery: string;
    sortOrder: "desc" | "asc";
    setTokens: (tokens: TokenCardProps[]) => void;
    appendTokens: (tokens: TokenCardProps[]) => void;
    setSearchQuery: (query: string) => void;
    toggleSort: () => void;
    filterTokens: () => void;
}

export const useTokenStore = create<TokenStore>((set, get) => ({
    tokens: [],
    filteredTokens: [],
    searchQuery: "",
    sortOrder: "desc",

    setTokens: tokens => {
        set({ tokens });
        get().filterTokens();
    },

    appendTokens: newTokens => {
        const existing = get().tokens;
        const map = new Map<string, TokenCardProps>();
        // Keep latest occurrence per id (new tokens override old)
        [...existing, ...newTokens].forEach(t => map.set(t.id, t));
        set({ tokens: Array.from(map.values()) });
        get().filterTokens();
    },

    setSearchQuery: query => {
        set({ searchQuery: query });
        get().filterTokens();
    },

    toggleSort: () => {
        const current = get().sortOrder;
        set({ sortOrder: current === "desc" ? "asc" : "desc" });
        get().filterTokens();
    },

    filterTokens: () => {
        const { tokens, searchQuery, sortOrder } = get();

        let filtered = tokens;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = tokens.filter(token => token.id.toLowerCase().includes(query));
        }

        // Create a new array before sorting to avoid mutation
        const sorted = [...filtered].sort((a, b) => {
            const tA = new Date(a.timestamp).getTime();
            const tB = new Date(b.timestamp).getTime();
            return sortOrder === "desc" ? tB - tA : tA - tB;
        });

        set({ filteredTokens: sorted });
    },
}));
