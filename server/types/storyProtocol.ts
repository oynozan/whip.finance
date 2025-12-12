export type AssetType = "new_minted" | "derivative";

export type NewMintedAssetData = {
    nftAddress: string;
    name: string;
    description: string;
    image: string;
    attributes: {
        name: string;
        value: string;
    }[];
};

export type DerivativeAssetData = {
    name: string;
    description: string;
    image: string;
    attributes: {
        name: string;
        value: string;
    }[];
};

export type AssetData<T extends AssetType> = T extends "new_minted"
    ? NewMintedAssetData
    : DerivativeAssetData;
