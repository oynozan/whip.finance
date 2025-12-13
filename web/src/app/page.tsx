"use client";

import { useEffect, useRef, useState } from "react";
import ColumnHeader from "@/components/ColumnHeader";
import TokenCard from "@/components/TokenCard";
import { useTokenStore } from "@/store/tokenStore";
import { Loader2 } from "lucide-react";

export default function Home() {
    const { filteredTokens, setTokens, appendTokens, toggleSort, sortOrder } = useTokenStore();
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const observerRef = useRef<HTMLDivElement | null>(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const fetchIps = async (pageToLoad: number) => {
            // Prevent duplicate fetches
            if (isFetchingRef.current) return;
            
            isFetchingRef.current = true;
            setIsLoading(true);
            
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_SERVER}/ip?page=${pageToLoad}&limit=20`,
                );
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
                        marketCap: ip.reserve || 0, // Market Cap = Reserve (TVL)
                        volume24h: 0,
                        priceChange1m: 0,
                        supply: ip.supply,
                        currentPrice: ip.currentPrice,
                        isDerivative: ip.type === "derivative",
                    }),
                );
                if (pageToLoad === 1) {
                    setTokens(mapped);
                } else {
                    appendTokens(mapped);
                }
                setHasMore(Boolean(data.hasMore));
            } catch (err) {
                console.error("Failed to load IPs", err);
            } finally {
                setIsLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchIps(page);
        // Only depend on page number to prevent infinite loops
        // setTokens and appendTokens are stable Zustand actions
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        const sentinel = observerRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            entries => {
                const first = entries[0];
                if (first.isIntersecting && hasMore && !isLoading) {
                    setPage(prev => prev + 1);
                }
            },
            { root: null, rootMargin: "200px", threshold: 0 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoading]);

    return (
                    <div className="flex-1 flex flex-col">
                        <ColumnHeader
                            title="Trenches"
                onSort={toggleSort}
                sortLabel={sortOrder === "desc" ? "Newest" : "Oldest"}
                        />

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden max-h-[calc(100vh-10rem-2px)]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                {filteredTokens.map(token => (
                                    <TokenCard key={token.id} token={token} />
                                ))}
                            </div>
                <div
                    ref={observerRef}
                    className="h-12 flex items-center justify-center text-xs text-muted-text"
                >
                    {isLoading
                        ? <Loader2 className="size-4 animate-spin" />
                        : hasMore
                            ? ""
                            : "No more to see here"}
                    </div>
            </div>
        </div>
    );
}
