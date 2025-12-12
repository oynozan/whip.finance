import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface IIP extends Document {
    user: string;
    ipId: string;
    tx: string;
    type: "new_minted" | "derivative";
    nftId: string;
    parentIpId?: string; // For derivative assets
    createdAt: Date;
}

const IPSchema = new Schema<IIP>(
    {
        user: { type: String, required: true },
        ipId: { type: String, required: true, index: true },
        tx: { type: String, required: true },
        type: { type: String, enum: ["new_minted", "derivative"], required: true },
        nftId: { type: String, required: true },
        parentIpId: { type: String }, // Optional, only for derivatives
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

export const IP: Model<IIP> = mongoose.models.IP || mongoose.model<IIP>("IP", IPSchema);

export default IP;

