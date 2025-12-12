import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { Account, Address, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, parseEventLogs, type Transport } from "viem";

import { IPAssetRegistryABI } from "../abi/IPAssetRegistry";
import type { AssetType, DerivativeAssetData, NewMintedAssetData } from "../types/storyProtocol";

const privateKey: Address = process.env.WALLET_PRIVATE_KEY as `0x${string}`;
const account: Account = privateKeyToAccount(privateKey);
const config: StoryConfig = {
    account,
    transport: http(process.env.RPC_PROVIDER_URL!),
    chainId: "aeneid",
};

export const client = StoryClient.newClient(config);
const publicClient = createPublicClient({
    transport: http(process.env.RPC_PROVIDER_URL!) as Transport,
});

export default class StoryProtocol {
    static async validateTradableAsset<T extends AssetType>(
        type: T,
        wallet: string,
        tx: string,
        ipId: string,
        parentIpId?: string,
    ): Promise<{ success: boolean; error?: string }> {
        // Validate request
        const receipt = await publicClient.getTransactionReceipt({ hash: tx as `0x${string}` });

        if (!receipt) return { success: false, error: "Transaction receipt not found" };
        if (receipt.from.toLowerCase() !== wallet.toLowerCase())
            return { success: false, error: "Transaction sender does not match wallet" };
        if (receipt.status !== "success") return { success: false, error: "Transaction failed" };

        const events = parseEventLogs({
            abi: IPAssetRegistryABI,
            logs: receipt.logs,
        });

        console.log(events);

        switch (type) {
            case "new_minted":
                return StoryProtocol.validateNewMintedAsset(events, {
                    ipId: ipId,
                    tx: tx,
                });
            case "derivative":
                return StoryProtocol.validateDerivativeAsset(events, {
                    ipId: ipId,
                    tx: tx,
                    parentIpId: parentIpId!,
                });
        }
    }

    private static async validateNewMintedAsset(
        events: any[],
        data: {
            ipId: string;
            tx: string;
        },
    ) {
        const { ipId, tx } = data;
        const IPRegisteredEvent = events.find(event => event.eventName === "IPRegistered");

        if (!IPRegisteredEvent) return { success: false, error: "IPRegistered event not found" };
        if (IPRegisteredEvent.args.ipId.toLowerCase() !== ipId.toLowerCase())
            return { success: false, error: "IP id does not match" };
        if (tx !== IPRegisteredEvent.transactionHash)
            return { success: false, error: "Transaction hash does not match" };

        // TODO: Validate 10% royalty as well

        return { success: true };
    }

    private static async validateDerivativeAsset(
        events: any[],
        data: {
            ipId: string;
            tx: string;
            parentIpId: string;
        },
    ) {
        const { ipId, tx, parentIpId } = data;
        const IPRegisteredEvent = events.find(event => event.eventName === "IPRegistered");

        if (!IPRegisteredEvent) return { success: false, error: "IPRegistered event not found" };
        if (IPRegisteredEvent.args.ipId.toLowerCase() !== ipId.toLowerCase())
            return { success: false, error: "IP id does not match" };
        if (tx !== IPRegisteredEvent.transactionHash)
            return { success: false, error: "Transaction hash does not match" };

        // TODO: Validate parent IP relationship and royalty

        return { success: true };
    }
}
