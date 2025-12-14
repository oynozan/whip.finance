"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useCallback } from "react";

import { socket } from "@/lib/socket";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatPercentage, formatMarketCap, formatTimeAgo, getChangeColor } from "@/lib/utils";
import { usePriceDataStore } from "@/store/priceDataStore";

export default function WatchlistPage() {
    const watchlist = useWatchlistStore(state => state.watchlist);
    const tokens = useMemo(() => Object.values(watchlist), [watchlist]);
    const removeFromWatchlist = useWatchlistStore(state => state.removeFromWatchlist);
    const updatePricing = useWatchlistStore(state => state.updatePricing);
    const ipPriceUSD = usePriceDataStore(state => state.price);

    // Listen to global price updates for all tokens in watchlist
    const handleIPUpdate = useCallback(
        (data: {
            ipId: string;
            supply: number;
            currentPrice: number;
            reserve: number;
            marketCap: number;
        }) => {
            try {
                // Only update if token is in watchlist
                if (watchlist[data.ipId]) {
                    console.log("💰 Watchlist: Updating pricing for", data.ipId);
                    updatePricing(data.ipId, {
                        marketCap: data.marketCap,
                        currentPrice: data.currentPrice,
                        supply: data.supply,
                        reserve: data.reserve,
                    });
                }
            } catch (error) {
                console.error("Error handling ip-update:", error);
            }
        },
        [watchlist, updatePricing],
    );

    useEffect(() => {
        // Listen to global ip-update events
        socket.on("ip-update", handleIPUpdate);

        return () => {
            socket.off("ip-update", handleIPUpdate);
        };
    }, [handleIPUpdate]);

    return (
        <>
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                <div>
                    <h1 className="text-xl font-semibold">Watchlist</h1>
                    <p className="text-sm text-muted-text">
                        Monitor your favorite tokens in one place.
                    </p>
                </div>
                <span className="text-sm text-muted-text">{tokens.length} tokens</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden">
                {tokens.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-text text-sm">
                        You haven&apos;t added any tokens to your watchlist yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-border-subtle rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary-bg text-muted-text">
                                <tr>
                                    <th className="text-left font-medium px-4 py-3">Token</th>
                                    <th className="text-left font-medium px-4 py-3">Market Cap</th>
                                    <th className="text-left font-medium px-4 py-3">Price</th>
                                    <th className="text-left font-medium px-4 py-3">1m %</th>
                                    <th className="text-right font-medium px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map(token => {
                                    const marketCapUSD = (token.marketCap || 0) * (ipPriceUSD || 1);
                                    const priceUSD = (token.currentPrice || 0) * (ipPriceUSD || 1);

                                    return (
                                        <tr
                                            key={token.id}
                                            className="border-t border-border-subtle hover:bg-secondary-bg/40 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3">
                                                <Link href={`/ip/${token.id}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Image
                                                            src={token.avatar}
                                                            alt={token.name}
                                                            width={32}
                                                            height={32}
                                                            className="w-8 h-8 rounded-lg border border-border-subtle object-cover"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-foreground">
                                                                {token.name}
                                                            </p>
                                                            <p className="text-xs text-muted-text">
                                                                {formatTimeAgo(token.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-foreground font-medium">
                                                        {formatMarketCap(marketCapUSD)}
                                                    </p>
                                                    <p className="text-xs text-muted-text">
                                                        {(token.marketCap || 0).toFixed(2)} IP
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-foreground font-medium">
                                                        ${priceUSD.toFixed(6)}
                                                    </p>
                                                    <p className="text-xs text-muted-text">
                                                        {(token.currentPrice || 0).toFixed(4)} IP
                                                    </p>
                                                </div>
                                            </td>
                                            <td
                                                className={`px-4 py-3 font-medium ${getChangeColor(token.priceChange1m)}`}
                                            >
                                                {formatPercentage(token.priceChange1m)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    className="text-xs text-negative hover:underline"
                                                    onClick={e => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        removeFromWatchlist(token.id);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
