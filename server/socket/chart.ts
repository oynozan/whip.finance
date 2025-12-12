import { SocketListener } from "../socket";
import { TradeEngine } from "../lib/tradeEngine";

export class ChartListener extends SocketListener {
    listen() {
        // Client requests chart data when joining an IP page
        this.socket.on("chart-data", async ({ ipId, limit }) => {
            if (!ipId) return;
            
            try {
                const candlesticks = await TradeEngine.getCandlesticks(ipId, limit || 100);
                this.socket.emit("chart-data", candlesticks);
            } catch (error: any) {
                console.error("Failed to fetch chart data:", error);
                this.socket.emit("chart-error", { 
                    ipId, 
                    message: error?.message || "Failed to load chart data" 
                });
            }
        });
    }
}

