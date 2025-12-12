import { SocketListener } from "../socket";

const coins = ["IP"];

export class DataFeed extends SocketListener {
    private prices: { price: number; lastUpdated: Date | null } = {
        price: 0,
        lastUpdated: null,
    };

    listen() {
        this.socket.on("ip-price", async () => {
            // Update every 5 minutes
            if (
                this.prices.lastUpdated &&
                this.prices.lastUpdated.getTime() + 5 * 60 * 1000 > Date.now()
            ) {
                this.socket.emit("ip-price", this.prices);
                return;
            }

            const pricesReq = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=${coins.join(",")}`,
                {
                    headers: new Headers({
                        accept: "application/json",
                        "x-cg-demo-api-key": process.env.COINGECKO_API_KEY!,
                    }),
                },
            );

            const data = await pricesReq.json();

            this.prices.price = data.ip.usd;
            this.prices.lastUpdated = new Date();

            this.socket.emit("ip-price", this.prices);
            this.socket.emit("log", `$IP price updated: $${this.prices.price}`);
        });
    }
}
