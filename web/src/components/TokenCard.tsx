"use client";

import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useSyncExternalStore, memo, useCallback, useMemo } from "react";
import { Twitter, Send, Globe, Copy, TrendingUp, Star } from "lucide-react";

import { TokenCardProps } from "@/types/token";
import { useWatchlistStore } from "@/store/watchlistStore";
import { usePriceDataStore } from "@/store/priceDataStore";
import { useMarketDataStore } from "@/store/marketDataStore";
import { formatAge, formatMarketCap, formatPercentage, getChangeColor } from "@/lib/utils";

// Shared ticking clock to avoid one interval per card
let tickInterval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (!tickInterval) {
        tickInterval = setInterval(() => listeners.forEach(fn => fn()), 1000);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
    };
};
const getNow = () => Date.now();

function useNow() {
    return useSyncExternalStore(subscribe, getNow, getNow);
}

function TokenCard({ token }: { token: TokenCardProps }) {
    const toggleWatchlist = useWatchlistStore(state => state.toggleWatchlist);
    const isWatchlisted = useWatchlistStore(state => Boolean(state.watchlist[token.id]));
    const ipPriceUSD = usePriceDataStore(state => state.price);
    const liveData = useMarketDataStore(state => state.ipData[token.id] || null);
    const now = useNow();

    // Memoize expensive calculations
    const supply = useMemo(
        () => liveData?.supply ?? token.supply ?? 0,
        [liveData?.supply, token.supply],
    );
    const reserve = useMemo(() => liveData?.reserve ?? 0, [liveData?.reserve]);

    // TVL for bonding curves
    const marketCapIP = useMemo(
        () => liveData?.marketCap ?? reserve,
        [liveData?.marketCap, reserve],
    );
    const marketCapUSD = useMemo(() => marketCapIP * (ipPriceUSD || 1), [marketCapIP, ipPriceUSD]);

    const handleCopy = useCallback(
        async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(token.id);
                toast.success("IP ID copied");
            } catch {
                toast.error("Failed to copy");
            }
        },
        [token.id],
    );

    const handleToggleWatchlist = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWatchlist(token);
        },
        [toggleWatchlist, token],
    );

    const getSocialIcon = useCallback((platform: string) => {
        switch (platform) {
            case "twitter":
                return <Twitter className="w-3 h-3" />;
            case "telegram":
                return <Send className="w-3 h-3" />;
            case "website":
                return <Globe className="w-3 h-3" />;
            default:
                return null;
        }
    }, []);

    return (
        <Link
            href={`/ip/${token.id}`}
            className="card p-1.5 sm:p-2 hover:shadow-lg hover:shadow-positive/5 rounded-lg"
        >
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                {token.avatar ? (
                    <Image
                        quality={100}
                        src={token.avatar}
                        alt={token.name}
                        width={96}
                        height={96}
                        className="aspect-square h-16 w-16 sm:h-24 sm:w-24 rounded-lg border-2 border-primary object-cover shrink-0"
                    />
                ) : (
                    <div className="aspect-square h-16 w-16 sm:h-24 sm:w-24 rounded-lg border-2 border-primary bg-border-subtle flex items-center justify-center text-lg font-semibold text-foreground shrink-0">
                        {token.name.slice(0, 2).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h3 className="font-semibold text-xs sm:text-sm truncate">
                                {token.name}
                            </h3>
                            {token.isDerivative && (
                                <span
                                    className="text-xs font-mono text-muted-text px-1.5 py-0.5 rounded bg-border-subtle"
                                    title="Derivative Asset"
                                >
                                    d/dx
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                className={`p-1 rounded transition-colors ${
                                    isWatchlisted
                                        ? "text-orange-300 bg-border-subtle"
                                        : "hover:bg-border-subtle text-muted-text"
                                }`}
                                aria-pressed={isWatchlisted}
                                aria-label={
                                    isWatchlisted ? "Remove from watchlist" : "Add to watchlist"
                                }
                                onClick={handleToggleWatchlist}
                            >
                                <Star
                                    className={`w-4 h-4 ${isWatchlisted ? "fill-current" : ""}`}
                                />
                            </button>
                            <button
                                className="p-1 hover:bg-border-subtle rounded transition-colors"
                                onClick={handleCopy}
                                aria-label="Copy IP ID"
                            >
                                <Copy className="w-4 h-4 text-muted-text" />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-text mb-2">
                        <span className="text-primary">{formatAge(token.timestamp, now)}</span>
                        {token.socialLinks && token.socialLinks.length > 0 && (
                            <div className="flex items-center gap-1">
                                {token.socialLinks.slice(0, 3).map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:text-primary transition-colors"
                                    >
                                        {getSocialIcon(link.platform)}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-end gap-1">
                                <span
                                    className="text-lg font-bold font-mono"
                                    style={{ lineHeight: "1" }}
                                >
                                    {formatMarketCap(marketCapUSD)}
                                </span>
                                <span className="text-muted-text text-xs">MC</span>
                            </div>
                            <span
                                className={`text-xs font-medium ${getChangeColor(token.priceChange1m)}`}
                                title="1 minute price change"
                            >
                                {formatPercentage(token.priceChange1m)}
                            </span>
                        </div>
                        <div className="w-fit text-[11px] text-end text-secondary-text mb-1">
                            {supply.toLocaleString()} IP •{" "}
                            {marketCapIP.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{" "}
                            IP TVL
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1 py-1 bg-secondary-bg rounded">
                            <TrendingUp className="w-3 h-3 text-positive" />
                            <span className="text-muted-text whitespace-nowrap">
                                Vol: {formatMarketCap(token.volume24h)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// Custom comparison function to prevent unnecessary re-renders
// Only re-render if token.id or token timestamp changes (for the live counter)
const areEqual = (prevProps: { token: TokenCardProps }, nextProps: { token: TokenCardProps }) => {
    return (
        prevProps.token.id === nextProps.token.id &&
        prevProps.token.name === nextProps.token.name &&
        prevProps.token.avatar === nextProps.token.avatar &&
        prevProps.token.isDerivative === nextProps.token.isDerivative &&
        prevProps.token.volume24h === nextProps.token.volume24h &&
        prevProps.token.priceChange1m === nextProps.token.priceChange1m
        // Intentionally not comparing timestamp so the live age updates
        // marketCap, supply, currentPrice are handled by live data store
    );
};

// Export memoized component to prevent unnecessary re-renders
export default memo(TokenCard, areEqual);
