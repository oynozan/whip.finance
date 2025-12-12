import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

// NFT interface - stores all NFT metadata and form data
export interface INFT {
    name: string;
    ticker: string;
    description: string;
    imageUrl: string;
    imageIpfsHash: string;
    metadataIpfsHash: string;
    metadataHash: string; // SHA256 hash
    userId?: string;
    createdAt: Date;
}

// NFT Document interface
export interface INFTDocument extends INFT, Document {
    _id: Types.ObjectId;
}

// NFT Schema
const NFTSchema = new Schema<INFTDocument>(
    {
        name: { type: String, required: true },
        ticker: { type: String, required: true },
        description: { type: String, required: true },
        imageUrl: { type: String, required: true },
        imageIpfsHash: { type: String, required: true },
        metadataIpfsHash: { type: String, required: true },
        metadataHash: { type: String, required: true },
        userId: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

// Export NFT Model
export const NFT: Model<INFTDocument> =
    mongoose.models.NFT || mongoose.model<INFTDocument>("NFT", NFTSchema);

export default NFT;
