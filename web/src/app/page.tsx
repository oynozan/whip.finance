"use client";

import { useRef, useState, useCallback } from "react";
import ColumnHeader from "@/components/ColumnHeader";
import TokenCard from "@/components/TokenCard";
import { useTokenStore } from "@/store/tokenStore";
import { Loader2 } from "lucide-react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

export default function Home() {
    const { filteredTokens, setTokens, appendTokens, toggleSort, sortOrder } = useTokenStore();

    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const loadPage = useCallback(
        async (page: number) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER}/ip?page=${page}&limit=20`);

            if (!res.ok) throw new Error("Failed to fetch IPs");

            const data = await res.json();
            const ips = data.ips || [];

            const mapped = ips.map(
                (ip: {
                    ipId: string;
                    createdAt: string;
                    type?: string;
                    nft?: { name?: string; imageUrl?: string };
                    supply?: number;
                    currentPrice?: number;
                    reserve?: number;
                }) => ({
                    id: ip.ipId,
                    name: ip.nft?.name || ip.ipId,
                    avatar: ip.nft?.imageUrl ?? "",
                    timestamp: new Date(ip.createdAt),
                    marketCap: ip.reserve || 0,
                    volume24h: 0,
                    priceChange1m: 0,
                    supply: ip.supply,
                    currentPrice: ip.currentPrice,
                    isDerivative: ip.type === "derivative",
                }),
            );

            if (page === 1) {
                setTokens(mapped);
            } else {
                appendTokens(mapped);
            }

            setHasMore(Boolean(data.hasMore));
        },
        [appendTokens, setTokens],
    );

    const { isLoading } = useInfiniteScroll(sentinelRef, {
        hasMore,
        loadPage,
        rootMargin: "150px",
    });

    return (
        <div className="flex-1 flex flex-col">
            <ColumnHeader
                title="Trenches"
                onSort={toggleSort}
                sortLabel={sortOrder === "desc" ? "Newest" : "Oldest"}
            />

            <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 scrollbar-hidden max-h-[calc(100vh-10rem-2px)]">
                <div className="grid max-[930px]:grid-cols-1 max-[1400px]:grid-cols-2 max-[1800px]:grid-cols-3 max-[2150px]:grid-cols-4 grid-cols-5 gap-2 sm:gap-3">
                    {filteredTokens.map(token => (
                        <TokenCard key={token.id} token={token} />
                    ))}
                </div>

                <div
                    ref={sentinelRef}
                    className="h-12 flex items-center justify-center text-xs text-muted-text"
                >
                    {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : hasMore ? (
                        ""
                    ) : (
                        "No more to see here"
                    )}
                </div>
            </div>
        </div>
    );
}
