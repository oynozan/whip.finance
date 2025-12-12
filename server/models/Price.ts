import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface IPrice extends Document {
    ipId: string;
    supply: number;
    reserve: number;
    basePrice: number;
    slope: number;
    currentPrice: number;
    updatedAt: Date;
}

const PriceSchema = new Schema<IPrice>(
    {
        ipId: { type: String, required: true, index: true, unique: true },
        supply: { type: Number, required: true, default: 10 },
        reserve: { type: Number, required: true, default: 0 },
        basePrice: { type: Number, required: true, default: 0.001 }, // $IP tokens
        slope: { type: Number, required: true, default: 0.01 },
        currentPrice: { type: Number, required: true, default: 0.101 },
        updatedAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

export const Price: Model<IPrice> =
    mongoose.models.Price || mongoose.model<IPrice>("Price", PriceSchema);

export default Price;

