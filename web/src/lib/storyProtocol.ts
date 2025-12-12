import { custom, parseEther, WalletClient } from "viem";
import { PILFlavor, StoryClient, StoryConfig, WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";

export async function setupStoryClient(wallet: WalletClient): Promise<StoryClient> {
    const config: StoryConfig = {
        wallet: wallet,
        transport: custom(wallet!.transport),
        chainId: "aeneid",
    };
    const client = StoryClient.newClient(config);
    return client;
}

export async function registerIp(
    client: StoryClient,
    nftMetadataURI: string,
    nftMetadataHash: `0x${string}`,
): Promise<{ txHash: `0x${string}`; ipId: string }> {
    const response = await client.ipAsset.registerIpAsset({
        licenseTermsData: [
            {
                terms: PILFlavor.commercialRemix({
                    commercialRevShare: 0,
                    defaultMintingFee: parseEther("0.005"),
                    currency: WIP_TOKEN_ADDRESS,
                }),
            },
        ],
        royaltyShares: [
            {
                recipient: process.env.NEXT_PUBLIC_WHIP_WALLET! as `0x${string}`,
                percentage: 10,
            },
        ],
        nft: {
            type: "mint",
            spgNftContract: "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc",
        },
        ipMetadata: {
            nftMetadataURI,
            nftMetadataHash,
        },
    });

    if (!response.txHash || !response.ipId) {
        throw new Error("Failed to register IP");
    }

    return { txHash: response.txHash, ipId: response.ipId };
}

export async function registerDerivativeIp(
    client: StoryClient,
    nftMetadataURI: string,
    nftMetadataHash: `0x${string}`,
    parentIpId: string,
) {
    const response = await client.ipAsset.registerDerivativeIpAsset({
        derivData: {
            parentIpIds: [parentIpId as `0x${string}`],
            licenseTermsIds: [],
        },
        licenseTermsData: [
            {
                terms: PILFlavor.commercialRemix({
                    commercialRevShare: 0,
                    defaultMintingFee: parseEther("0.005"),
                    currency: WIP_TOKEN_ADDRESS,
                }),
            },
        ],
        royaltyShares: [
            {
                recipient: process.env.NEXT_PUBLIC_WHIP_WALLET! as `0x${string}`,
                percentage: 10,
            },
        ],
        nft: {
            type: "mint",
            spgNftContract: "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc",
        },
        ipMetadata: {
            nftMetadataURI,
            nftMetadataHash,
        },
    });

    if (!response.txHash || !response.ipId) {
        throw new Error("Failed to register derivative IP");
    }

    return { txHash: response.txHash, ipId: response.ipId };
}
