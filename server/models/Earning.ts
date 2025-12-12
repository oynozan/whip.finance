import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface IEarning extends Document {
    wallet: string;
    ipId: string;
    type: "ip_owner" | "protocol";
    amount: number; // in $IP tokens
    txHash: string;
    createdAt: Date;
}

const EarningSchema = new Schema<IEarning>(
    {
        wallet: { type: String, required: true, index: true },
        ipId: { type: String, required: true, index: true },
        type: { type: String, enum: ["ip_owner", "protocol"], required: true },
        amount: { type: Number, required: true },
        txHash: { type: String, required: true, unique: true },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

// Compound index for efficient queries
EarningSchema.index({ wallet: 1, createdAt: -1 });
EarningSchema.index({ ipId: 1, createdAt: -1 });

export const Earning: Model<IEarning> =
    mongoose.models.Earning || mongoose.model<IEarning>("Earning", EarningSchema);

export default Earning;

