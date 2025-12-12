import { createHash } from "crypto";
import { PinataSDK } from "pinata";

// Initialize Pinata SDK with JWT token
const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT_TOKEN!,
    pinataGateway: "gateway.pinata.cloud",
});

// Upload image file to Pinata IPFS
export async function uploadImageToIPFS(file: Blob): Promise<string> {
    // Convert Blob to File for Pinata SDK
    const fileToUpload = new File([file], "image.png", { type: file.type });

    const upload = await pinata.upload.public.file(fileToUpload);
    return upload.cid;
}

// Upload JSON metadata to Pinata IPFS
export async function uploadJSONToIPFS(metadata: object): Promise<string> {
    const upload = await pinata.upload.public.json(metadata);
    return upload.cid;
}

// Create SHA256 hash of metadata
export function createMetadataHash(metadata: object): string {
    return createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
}

