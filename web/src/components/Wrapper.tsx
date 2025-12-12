"use client";

import { http } from "viem";
import { useEffect } from "react";
import { aeneid } from "@story-protocol/core-sdk";
import { createConfig, WagmiProvider } from "wagmi";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { socket } from "@/lib/socket";
import { WindowManager } from "./Window";
import { Toaster } from "@/components/ui/sonner";
import { useWatchlistStore } from "@/store/watchlistStore";
import { usePriceDataStore } from "@/store/priceDataStore";
import { useLogsStore } from "@/store/logsStore";
import { useMarketDataStore } from "@/store/marketDataStore";

const config = createConfig({
    chains: [aeneid],
    multiInjectedProviderDiscovery: false,
    transports: {
        [aeneid.id]: http(),
    },
});

const queryClient = new QueryClient();

const storyAeneidNetwork = {
    blockExplorerUrls: [aeneid.blockExplorers.default.url],
    chainId: aeneid.id,
    chainName: aeneid.name,
    iconUrls: ["https://www.story.foundation/icon.png"],
    name: aeneid.name,
    nativeCurrency: aeneid.nativeCurrency,
    networkId: aeneid.id,
    rpcUrls: [aeneid.rpcUrls.default.http[0]],
    vanityName: "Story Aeneid Testnet",
};

export default function Wrapper({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        useWatchlistStore.getState().loadWatchlist();

        // Add initial log
        useLogsStore.getState().addLog("Connected to server");

        socket.emit("ip-price");
        
        // Use getState() to access store actions without dependencies
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
            const { updateIPData } = useMarketDataStore.getState();
            updateIPData(data.ipId, {
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
    }, []); // Empty deps - socket listeners are stable

    return (
        <DynamicContextProvider
            settings={{
                environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
                walletConnectors: [EthereumWalletConnectors],
                overrides: {
                    evmNetworks: () => [storyAeneidNetwork],
                },
            }}
        >
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <DynamicWagmiConnector>
                        {children}
                        <WindowManager />
                        <Toaster richColors position="top-center" />
                    </DynamicWagmiConnector>
                </QueryClientProvider>
            </WagmiProvider>
        </DynamicContextProvider>
    );
}
