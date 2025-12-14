"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";

import { useWindowStore } from "@/store/windowStore";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatMarketCap, formatPercentage, getChangeColor } from "@/lib/utils";

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { openWindow } = useWindowStore();
    const watchlist = useWatchlistStore(state => state.watchlist);
    const watchlistTokens = useMemo(() => Object.values(watchlist), [watchlist]);

    const handlePositionsClick = () => {
        openWindow(
            "positions",
            "Open Positions",
            <div className="text-sm text-secondary-text">No open positions yet.</div>,
        );
    };

    if (isCollapsed) {
        return (
            <div className="hidden sm:flex w-12 h-[calc(100vh-81px)] bg-secondary-bg border-r border-border-subtle flex-col items-center py-4">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-2 hover:bg-border-subtle rounded-lg transition-colors"
                >
                    <ChevronRight className="w-4 h-4 text-secondary-text" />
                </button>
            </div>
        );
    }

    return (
        <div className="hidden sm:flex sm:w-48 lg:w-64 h-[calc(100vh-81px)] bg-secondary-bg border-r border-border-subtle flex-col">
            <div className="flex flex-col flex-1 overflow-y-hidden">
                <div className="flex items-center justify-between px-2 h-12">
                    <button
                        onClick={handlePositionsClick}
                        className="w-full flex flex-1 items-center gap-2 px-3 py-2 text-sm text-secondary-text hover:text-foreground hover:bg-border-subtle rounded-lg transition-colors"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Positions
                    </button>

                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="p-1 hover:bg-border-subtle rounded transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-secondary-text" />
                    </button>
                </div>

                <div className="flex-1 px-4 py-3 border-t border-border-subtle overflow-y-auto">
                    <h3 className="text-xs font-semibold text-muted-text mb-3">Watchlist</h3>
                    <div>
                        {watchlistTokens.length === 0 ? (
                            <div className="text-xs text-white/30">
                                No assets are on your radar yet...
                            </div>
                        ) : (
                            watchlistTokens.map(token => (
                                <Link
                                    href={`/watchlist`}
                                    key={token.id}
                                    className="text-xs flex items-center justify-between gap-2 hover:text-foreground hover:bg-border-subtle px-2 py-1.5 rounded-sm transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {token.avatar ? (
                                            <img
                                                src={token.avatar}
                                                alt={token.name}
                                                width={16}
                                                height={16}
                                                className="w-6 h-6 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-border-subtle flex items-center justify-center text-[10px] font-semibold text-foreground">
                                                {token.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="font-medium text-foreground text-[15px]">
                                            {token.name}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs font-medium text-foreground">
                                            {formatMarketCap(token.marketCap)}
                                        </span>
                                        <span
                                            className={`text-[10px] ${getChangeColor(token.priceChange1m)}`}
                                        >
                                            {formatPercentage(token.priceChange1m)}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="px-4 py-3 border-t border-border-subtle h-60 min-h-60">
                    <h3 className="text-xs font-semibold text-muted-text mb-3">
                        What&apos;s happening
                    </h3>
                    <div className="text-xs text-secondary-text">No activity yet.</div>
                </div>
            </div>
        </div>
    );
}
