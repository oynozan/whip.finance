import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface ICandlestick extends Document {
    ipId: string;
    time: string; // ISO 8601 timestamp or YYYY-MM-DD format
    open: number;
    high: number;
    low: number;
    close: number;
    tradeId: string; // Reference to the trade that created this candle
    createdAt: Date;
}

const CandlestickSchema = new Schema<ICandlestick>(
    {
        ipId: { type: String, required: true, index: true },
        time: { type: String, required: true },
        open: { type: Number, required: true },
        high: { type: Number, required: true },
        low: { type: Number, required: true },
        close: { type: Number, required: true },
        tradeId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

// Compound index for efficient queries by ipId and time
CandlestickSchema.index({ ipId: 1, createdAt: 1 });

export const Candlestick: Model<ICandlestick> =
    mongoose.models.Candlestick || mongoose.model<ICandlestick>("Candlestick", CandlestickSchema);

export default Candlestick;

