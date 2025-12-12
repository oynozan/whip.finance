import { createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { VAULT_ABI } from "../abi/Vault";

const aeneid = defineChain({
    id: 1513,
    name: "Story Aeneid Testnet",
    nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.RPC_PROVIDER_URL!] },
    },
    blockExplorers: {
        default: {
            name: "Story Explorer",
            url: "https://aeneid.explorer.story.foundation",
        },
    },
});

export class VaultHelpers {
    private static getWalletClient() {
        const privateKey = process.env.WALLET_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("WALLET_PRIVATE_KEY not configured");
        }

        const account = privateKeyToAccount(privateKey as `0x${string}`);
        
        return createWalletClient({
            account,
            chain: aeneid,
            transport: http(process.env.RPC_PROVIDER_URL!),
        });
    }

    /**
     * Register IP owner in Vault contract
     * @param ipId IP asset ID
     * @param ownerAddress Owner wallet address
     */
    static async registerIPOwner(ipId: string, ownerAddress: string): Promise<string> {
        const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS as `0x${string}`;
        
        if (!VAULT_ADDRESS) {
            throw new Error("VAULT_CONTRACT_ADDRESS not configured");
        }

        try {
            console.log(`[VaultHelpers] Registering IP owner:`, {
                ipId,
                owner: ownerAddress,
            });

            const walletClient = this.getWalletClient();

            const txHash = await walletClient.writeContract({
                address: VAULT_ADDRESS,
                abi: VAULT_ABI,
                functionName: "registerIPOwner",
                args: [ipId, ownerAddress as `0x${string}`],
            });

            console.log(`[VaultHelpers] ✅ IP owner registered - TX: ${txHash}`);
            return txHash;
        } catch (error: any) {
            // If already registered, log and continue
            if (error.message?.includes("IP already registered")) {
                console.log(`[VaultHelpers] ℹ️  IP ${ipId} already registered`);
                return "";
            }
            
            console.error(`[VaultHelpers] ❌ Error registering IP owner:`, error);
            throw error;
        }
    }
}

