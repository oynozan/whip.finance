import multer from "multer";
import { Router, Request, Response } from "express";

import NFT from "../../../models/NFT";
import { uploadImageToIPFS, uploadJSONToIPFS, createMetadataHash } from "../../../lib/pinata";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload NFT metadata endpoint
router.post("/upload-metadata", upload.single("image"), async (req: Request, res: Response) => {
    try {
        const { name, ticker, description } = req.body;
        const imageFile = (req as any).file as Express.Multer.File | undefined;

        // Validate required fields
        if (!name || !ticker || !description || !imageFile) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Upload image to IPFS
        const imageBlob = new Blob([new Uint8Array(imageFile.buffer)], {
            type: imageFile.mimetype,
        });
        const imageIpfsHash = await uploadImageToIPFS(imageBlob);
        const imageUrl = `${process.env.PINATA_GATEWAY}/ipfs/${imageIpfsHash}`;

        // Create NFT metadata object
        const nftMetadata = {
            name: name,
            description: description,
            image: imageUrl,
        };

        // Upload metadata JSON to IPFS
        const metadataIpfsHash = await uploadJSONToIPFS(nftMetadata);

        // Create SHA256 hash of metadata
        const metadataHash = createMetadataHash(nftMetadata);

        // Save NFT data to database
        const nft = await NFT.create({
            name,
            ticker,
            description,
            imageUrl,
            imageIpfsHash,
            metadataIpfsHash,
            metadataHash,
        });

        // Return response with IPFS hashes and NFT ID
        return res.json({
            success: true,
            nftId: nft._id.toString(),
            imageIpfsHash,
            metadataIpfsHash,
            metadataHash,
            imageUrl,
            metadataUrl: `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`,
            formData: {
                name,
                ticker,
                description,
            },
        });
    } catch (error) {
        console.error("Error uploading NFT metadata:", error);
        return res.status(500).json({ error: "Failed to upload NFT metadata" });
    }
});

export default router;
