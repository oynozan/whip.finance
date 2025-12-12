import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface ITrade extends Document {
    ipId: string;
    wallet?: string;
    side: "buy" | "sell";
    amountTokens: number;
    totalPaid: number;
    pricePerToken: number;
    createdAt: Date;
}

const TradeSchema = new Schema<ITrade>(
    {
        ipId: { type: String, required: true, index: true },
        wallet: { type: String },
        side: { type: String, enum: ["buy", "sell"], required: true },
        amountTokens: { type: Number, required: true },
        totalPaid: { type: Number, required: true },
        pricePerToken: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

export const Trade: Model<ITrade> =
    mongoose.models.Trade || mongoose.model<ITrade>("Trade", TradeSchema);

export default Trade;

