"use client";

import { http } from "viem";
import { aeneid } from "@story-protocol/core-sdk";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";

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

export default function WalletProviders({ children }: { children: React.ReactNode }) {
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
                    <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
                </QueryClientProvider>
            </WagmiProvider>
        </DynamicContextProvider>
    );
}
