import { SocketListener } from "../socket";
import { TradeEngine } from "../lib/tradeEngine";

export class TradeListener extends SocketListener {
    listen() {
        this.socket.on("join-ip", async (ipId: string) => {
            if (!ipId) return;
            this.socket.join(`ip:${ipId}`);
            
            // Send current price immediately
            try {
                const priceDoc = await TradeEngine.ensurePrice(ipId);
                this.socket.emit("price", {
                    price: priceDoc.currentPrice,
                    supply: priceDoc.supply,
                    reserve: priceDoc.reserve,
                });
            } catch (err) {
                console.error("Failed to fetch price on join:", err);
            }
        });

        this.socket.on("leave-ip", (ipId: string) => {
            if (!ipId) return;
            this.socket.leave(`ip:${ipId}`);
        });

        this.socket.on("trades", async ({ ipId, limit }) => {
            try {
                console.log(`[TradeListener] Fetching trades for ${ipId}, limit: ${limit}`);
                const trades = await TradeEngine.getRecentTrades(ipId, limit || 20);
                console.log(`[TradeListener] Found ${trades.length} trades`);
                
                // Transform trades to match frontend interface
                const formatted = trades.map((t: any) => ({
                    ipId: t.ipId,
                    side: t.side,
                    amountTokens: t.amountTokens,
                    total: t.totalPaid,
                    price: t.pricePerToken,
                    wallet: t.wallet || null,
                    createdAt: t.createdAt,
                    supply: 0, // Not stored per trade
                    reserve: 0, // Not stored per trade
                }));
                
                console.log(`[TradeListener] Emitting ${formatted.length} formatted trades`);
                this.socket.emit("trades", formatted);
            } catch (error: any) {
                console.error(`[TradeListener] Error fetching trades:`, error);
                this.socket.emit("trade-error", { ipId, message: error?.message || "Load trades failed" });
            }
        });
    }
}

