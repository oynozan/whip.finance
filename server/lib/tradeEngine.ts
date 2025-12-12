import IP from "../models/IP";
import Trade from "../models/Trade";
import Price from "../models/Price";
import Candlestick from "../models/Candlestick";
import { LinearBondingCurve } from "./bondingCurve";

export class TradeEngine {
    static async ensurePrice(ipId: string) {
        const existing = await Price.findOne({ ipId });
        if (existing) return existing;
        // Initial values: 10 tokens, 0 reserve
        // Market Cap = Reserve (TVL), starts at 0 until first trade
        // Bonding curve: P(s) = 0.001 + 0.01 * supply
        // At 10 tokens: P = 0.101 IP
        // At 100 tokens: P = 1.001 IP
        return Price.create({
            ipId,
            supply: 10,
            reserve: 0,
            basePrice: 0.001,
            slope: 0.01,
            currentPrice: 0.101,
        });
    }

    static async getCurve(ipId: string) {
        const ip = await IP.findOne({ ipId });
        if (!ip) throw new Error("IP not found");
        const priceDoc = await TradeEngine.ensurePrice(ipId);
        const curve = new LinearBondingCurve(priceDoc.basePrice, priceDoc.slope);
        return { ip, priceDoc, curve };
    }

    static async buy(ipId: string, amountTokens: number, wallet?: string) {
        if (amountTokens <= 0) throw new Error("Invalid amount");
        const { ip, priceDoc, curve } = await TradeEngine.getCurve(ipId);

        const oldPrice = priceDoc.currentPrice;
        const cost = curve.costToBuy(priceDoc.supply, amountTokens);
        const newSupply = priceDoc.supply + amountTokens;
        const newReserve = priceDoc.reserve + cost;
        const newPrice = curve.priceAtSupply(newSupply);
        priceDoc.supply = newSupply;
        priceDoc.reserve = newReserve;
        priceDoc.currentPrice = newPrice;
        priceDoc.updatedAt = new Date();
        await priceDoc.save();

        const trade = await Trade.create({
            ipId,
            wallet,
            side: "buy",
            amountTokens,
            totalPaid: cost,
            pricePerToken: newPrice,
        });

        // Create candlestick data point for this trade
        const candlestick = await TradeEngine.createCandlestick(
            ipId,
            oldPrice,
            newPrice,
            trade._id.toString()
        );

        return { ip, trade, cost, price: newPrice, supply: newSupply, reserve: newReserve, candlestick };
    }

    static async sell(ipId: string, amountTokens: number, wallet?: string) {
        if (amountTokens <= 0) throw new Error("Invalid amount");
        const { ip, priceDoc, curve } = await TradeEngine.getCurve(ipId);
        if (priceDoc.supply < amountTokens) throw new Error("Not enough supply");

        const oldPrice = priceDoc.currentPrice;
        const refund = curve.refundForSell(priceDoc.supply, amountTokens);
        const newSupply = priceDoc.supply - amountTokens;
        const newReserve = Math.max(0, priceDoc.reserve - refund);
        const newPrice = curve.priceAtSupply(newSupply);
        priceDoc.supply = newSupply;
        priceDoc.reserve = newReserve;
        priceDoc.currentPrice = newPrice;
        priceDoc.updatedAt = new Date();
        await priceDoc.save();

        const trade = await Trade.create({
            ipId,
            wallet,
            side: "sell",
            amountTokens,
            totalPaid: refund,
            pricePerToken: newPrice,
        });

        // Create candlestick data point for this trade
        const candlestick = await TradeEngine.createCandlestick(
            ipId,
            oldPrice,
            newPrice,
            trade._id.toString()
        );

        return { ip, trade, refund, price: newPrice, supply: newSupply, reserve: newReserve, candlestick };
    }

    static async getRecentTrades(ipId: string, limit = 20) {
        return Trade.find({ ipId }).sort({ createdAt: -1 }).limit(limit);
    }

    static async createCandlestick(
        ipId: string,
        openPrice: number,
        closePrice: number,
        tradeId: string
    ) {
        const now = new Date();
        const time = now.toISOString();

        // For trade-based candles: open is the previous price, close is the new price
        // High and low are the extremes of the two
        const high = Math.max(openPrice, closePrice);
        const low = Math.min(openPrice, closePrice);

        const candlestick = await Candlestick.create({
            ipId,
            time,
            open: openPrice,
            high,
            low,
            close: closePrice,
            tradeId,
        });

        return candlestick;
    }

    static async getCandlesticks(ipId: string, limit = 100) {
        const candles = await Candlestick.find({ ipId })
            .sort({ createdAt: 1 })
            .limit(limit);

        // Transform to lightweight-charts format
        return candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));
    }
}

