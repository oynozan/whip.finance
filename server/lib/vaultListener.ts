import { createPublicClient, http, type Log, formatEther } from "viem";
import { VAULT_ABI } from "../abi/Vault";
import { TradeEngine } from "./tradeEngine";
import { Server as SocketServer } from "socket.io";

const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS as `0x${string}`;
const RPC_URL = process.env.RPC_PROVIDER_URL!;

// Track processed transactions to prevent duplicates
const processedTxHashes = new Set<string>();

export class VaultListener {
    private client;
    private io: SocketServer;
    private isListening = false;

    constructor(io: SocketServer) {
        this.io = io;
        this.client = createPublicClient({
            transport: http(RPC_URL),
        });
    }

    async start() {
        console.log(`\n🔧 [VaultListener] Initializing...`);
        console.log(`   - Vault Address: ${VAULT_ADDRESS || 'NOT SET'}`);
        console.log(`   - RPC URL: ${RPC_URL || 'NOT SET'}`);
        
        if (this.isListening || !VAULT_ADDRESS) {
            console.warn("⚠️  [VaultListener] Already listening or no contract address configured");
            return;
        }

        this.isListening = true;
        console.log("🚀 [VaultListener] Starting to watch Vault contract events...");

        // Watch Buy events
        this.client.watchContractEvent({
            address: VAULT_ADDRESS,
            abi: VAULT_ABI,
            eventName: "Buy",
            onLogs: (logs: any[]) => {
                console.log(`[VaultListener] 📥 Received ${logs.length} Buy event(s)`);
                logs.forEach(log => this.handleBuyEvent(log));
            },
        });

        // Watch Sell events
        this.client.watchContractEvent({
            address: VAULT_ADDRESS,
            abi: VAULT_ABI,
            eventName: "Sell",
            onLogs: (logs: any[]) => {
                console.log(`[VaultListener] 📥 Received ${logs.length} Sell event(s)`);
                logs.forEach(log => this.handleSellEvent(log));
            },
        });

        console.log("✅ [VaultListener] Now watching Buy and Sell events");
        console.log("   Listening for on-chain transactions...\n");
    }

    private async handleBuyEvent(log: any) {
        const txHash = log.transactionHash;
        console.log(`\n========== BUY EVENT ==========`);
        console.log(`[VaultListener] Received Buy event - TX: ${txHash}`);
        
        try {
            // Prevent duplicate processing
            if (processedTxHashes.has(txHash)) {
                console.log(`[VaultListener] ⚠️  Buy tx ${txHash} already processed - skipping`);
                return;
            }

            const { user, ipId, amountTokens, amountPaid } = log.args;
            const wallet = user as string;
            // Convert from wei to float (amountTokens is in wei, 1 token = 1e18 wei)
            const amount = Number(formatEther(amountTokens));

            console.log(`[VaultListener] 📝 Event Details:`);
            console.log(`  - Buyer: ${wallet}`);
            console.log(`  - IP ID: ${ipId}`);
            console.log(`  - Amount Tokens (wei): ${amountTokens.toString()}`);
            console.log(`  - Amount Tokens (float): ${amount}`);
            console.log(`  - Amount Paid: ${amountPaid.toString()}`);

            console.log(`[VaultListener] 🔄 Processing trade in backend...`);

            // Process trade in backend
            const { ip, trade, cost, price, supply, reserve, candlestick } = await TradeEngine.buy(
                ipId as string,
                amount,
                wallet,
            );

            console.log(`[VaultListener] ✅ Trade processed successfully:`);
            console.log(`  - New Price: ${price}`);
            console.log(`  - New Supply: ${supply}`);
            console.log(`  - New Reserve: ${reserve}`);
            console.log(`  - Cost: ${cost}`);

            // Mark as processed
            processedTxHashes.add(txHash);
            console.log(`[VaultListener] ✓ TX marked as processed`);

            // Emit to all clients in the IP room
            const payload = {
                ipId,
                side: "buy",
                amountTokens: trade.amountTokens,
                total: cost,
                price,
                wallet,
                createdAt: trade.createdAt,
                supply,
                reserve,
            };

            console.log(`[VaultListener] 📡 Broadcasting to room: ip:${ipId}`);
            this.io.to(`ip:${ipId}`).emit("trade", payload);
            this.io.to(`ip:${ipId}`).emit("price", {
                price,
                supply,
                reserve,
            });

            // Emit new candlestick data
            if (candlestick) {
                const chartPayload = {
                    time: candlestick.time,
                    open: candlestick.open,
                    high: candlestick.high,
                    low: candlestick.low,
                    close: candlestick.close,
                };
                console.log(`[VaultListener] 📊 Emitting chart-update to room ip:${ipId}:`, JSON.stringify(chartPayload));
                this.io.to(`ip:${ipId}`).emit("chart-update", chartPayload);
            } else {
                console.log(`[VaultListener] ⚠️ No candlestick data to emit (BUY)`);
            }

            // Emit globally for UI updates everywhere
            const updatePayload = {
                ipId,
                supply,
                currentPrice: price,
                reserve,
                marketCap: reserve, // Market cap = Reserve (TVL) for bonding curves
            };
            console.log(`[VaultListener] 🌐 Emitting global ip-update (BUY):`, JSON.stringify(updatePayload));
            this.io.emit("ip-update", updatePayload);

            // Emit log
            this.io.emit("log", `Buy: ${amount} tokens of ${ipId} by ${wallet.slice(0, 6)}...`);
            console.log(`[VaultListener] 🎉 Buy event processed successfully`);
            console.log(`===============================\n`);
        } catch (error) {
            console.error(`[VaultListener] ❌ Error processing Buy event for TX ${txHash}:`);
            console.error(error);
            console.log(`===============================\n`);
        }
    }

    private async handleSellEvent(log: any) {
        const txHash = log.transactionHash;
        console.log(`\n========== SELL EVENT ==========`);
        console.log(`[VaultListener] Received Sell event - TX: ${txHash}`);
        
        try {
            // Prevent duplicate processing
            if (processedTxHashes.has(txHash)) {
                console.log(`[VaultListener] ⚠️  Sell tx ${txHash} already processed - skipping`);
                return;
            }

            const { user, ipId, amountTokens, amountReceived } = log.args;
            const wallet = user as string;
            // Convert from wei to float (amountTokens is in wei, 1 token = 1e18 wei)
            const amount = Number(formatEther(amountTokens));

            console.log(`[VaultListener] 📝 Event Details:`);
            console.log(`  - Seller: ${wallet}`);
            console.log(`  - IP ID: ${ipId}`);
            console.log(`  - Amount Tokens (wei): ${amountTokens.toString()}`);
            console.log(`  - Amount Tokens (float): ${amount}`);
            console.log(`  - Amount Received: ${amountReceived.toString()}`);

            console.log(`[VaultListener] 🔄 Processing trade in backend...`);

            // Process trade in backend
            const { ip, trade, refund, price, supply, reserve, candlestick } = await TradeEngine.sell(
                ipId as string,
                amount,
                wallet,
            );

            console.log(`[VaultListener] ✅ Trade processed successfully:`);
            console.log(`  - New Price: ${price}`);
            console.log(`  - New Supply: ${supply}`);
            console.log(`  - New Reserve: ${reserve}`);
            console.log(`  - Refund: ${refund}`);

            // Mark as processed
            processedTxHashes.add(txHash);
            console.log(`[VaultListener] ✓ TX marked as processed`);

            // Emit to all clients in the IP room
            const payload = {
                ipId,
                side: "sell",
                amountTokens: trade.amountTokens,
                total: refund,
                price,
                wallet,
                createdAt: trade.createdAt,
                supply,
                reserve,
            };

            console.log(`[VaultListener] 📡 Broadcasting to room: ip:${ipId}`);
            this.io.to(`ip:${ipId}`).emit("trade", payload);
            this.io.to(`ip:${ipId}`).emit("price", {
                price,
                supply,
                reserve,
            });

            // Emit new candlestick data
            if (candlestick) {
                const chartPayload = {
                    time: candlestick.time,
                    open: candlestick.open,
                    high: candlestick.high,
                    low: candlestick.low,
                    close: candlestick.close,
                };
                console.log(`[VaultListener] 📊 Emitting chart-update to room ip:${ipId}:`, JSON.stringify(chartPayload));
                this.io.to(`ip:${ipId}`).emit("chart-update", chartPayload);
            } else {
                console.log(`[VaultListener] ⚠️ No candlestick data to emit (SELL)`);
            }

            // Emit globally for UI updates everywhere
            const updatePayload = {
                ipId,
                supply,
                currentPrice: price,
                reserve,
                marketCap: reserve, // Market cap = Reserve (TVL) for bonding curves
            };
            console.log(`[VaultListener] 🌐 Emitting global ip-update (SELL):`, JSON.stringify(updatePayload));
            this.io.emit("ip-update", updatePayload);

            // Emit log
            this.io.emit("log", `Sell: ${amount} tokens of ${ipId} by ${wallet.slice(0, 6)}...`);
            console.log(`[VaultListener] 🎉 Sell event processed successfully`);
            console.log(`================================\n`);
        } catch (error) {
            console.error(`[VaultListener] ❌ Error processing Sell event for TX ${txHash}:`);
            console.error(error);
            console.log(`================================\n`);
        }
    }

    stop() {
        console.log(`\n🛑 [VaultListener] Stopping...`);
        this.isListening = false;
        const processedCount = processedTxHashes.size;
        processedTxHashes.clear();
        console.log(`   - Cleared ${processedCount} processed transaction(s)`);
        console.log("✅ [VaultListener] Stopped\n");
    }
}

