"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import { socket } from "@/lib/socket";
import { WindowManager } from "./Window";
import { Toaster } from "@/components/ui/sonner";
import { useWatchlistStore } from "@/store/watchlistStore";
import { usePriceDataStore } from "@/store/priceDataStore";
import { useLogsStore } from "@/store/logsStore";
import { useMarketDataStore } from "@/store/marketDataStore";

const WalletProviders = dynamic(
    () => import("./Wallet"),
    { ssr: false }
);

export default function Wrapper({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        useWatchlistStore.getState().loadWatchlist();
        useLogsStore.getState().addLog("Connected to server");

        socket.emit("ip-price");

        const handleIPPrice = (data: { price: number; lastUpdated: Date | null }) => {
            if (!data?.price) return;
            const { setPrice, setLastUpdated } = usePriceDataStore.getState();
            setPrice(data.price);
            setLastUpdated(data.lastUpdated!);
        };

        const handleLog = (message: string) => {
            useLogsStore.getState().addLog(message);
        };

        const handleIPUpdate = (data: {
            ipId: string;
            supply: number;
            currentPrice: number;
            reserve: number;
            marketCap: number;
        }) => {
            useMarketDataStore.getState().updateIPData(data.ipId, {
                supply: data.supply,
                currentPrice: data.currentPrice,
                reserve: data.reserve,
                marketCap: data.marketCap,
            });
        };

        socket.on("ip-price", handleIPPrice);
        socket.on("log", handleLog);
        socket.on("ip-update", handleIPUpdate);

        return () => {
            socket.off("ip-price", handleIPPrice);
            socket.off("log", handleLog);
            socket.off("ip-update", handleIPUpdate);
        };
    }, []);

    return (
        <WalletProviders>
            {children}
            <WindowManager />
            <Toaster richColors position="top-center" />
        </WalletProviders>
    );
}
