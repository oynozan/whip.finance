import { Server } from "socket.io";
import { createPublicClient, http, formatEther } from "viem";
import { EARNINGS_ABI } from "../abi/Earnings";
import Earning from "../models/Earning";

export class EarningsListener {
    private io: Server;
    private processedTxHashes: Set<string> = new Set();

    constructor(io: Server) {
        this.io = io;
    }

    start() {
        const RPC_URL = process.env.RPC_PROVIDER_URL!;
        const EARNINGS_ADDRESS = process.env.EARNINGS_CONTRACT_ADDRESS as `0x${string}`;

        if (!EARNINGS_ADDRESS) {
            console.error("[EarningsListener] ❌ EARNINGS_CONTRACT_ADDRESS not set");
            return;
        }

        console.log("[EarningsListener] 🎧 Starting earnings event listener...");
        console.log("[EarningsListener] 📍 Earnings Contract:", EARNINGS_ADDRESS);

        const publicClient = createPublicClient({
            transport: http(RPC_URL),
        });

        // Listen for EarningAdded events (IP owner earnings)
        publicClient.watchContractEvent({
            address: EARNINGS_ADDRESS,
            abi: EARNINGS_ABI,
            eventName: "EarningAdded",
            onLogs: async logs => {
                for (const log of logs) {
                    try {
                        const txHash = log.transactionHash;
                        if (!txHash || this.processedTxHashes.has(txHash)) {
                            console.log("[EarningsListener] ⏭️  Skipping duplicate earning tx:", txHash);
                            continue;
                        }

                        this.processedTxHashes.add(txHash);

                        const { user, ipId, amount } = log.args as {
                            user: `0x${string}`;
                            ipId: string;
                            amount: bigint;
                        };

                        const amountIP = parseFloat(formatEther(amount));

                        console.log("[EarningsListener] 💰 EarningAdded:", {
                            user,
                            ipId,
                            amount: amountIP,
                            txHash,
                        });

                        // Save to database
                        await Earning.create({
                            wallet: user.toLowerCase(),
                            ipId,
                            type: "ip_owner",
                            amount: amountIP,
                            txHash,
                        });

                        // Emit socket event to user
                        this.io.to(`wallet:${user.toLowerCase()}`).emit("earning-added", {
                            wallet: user.toLowerCase(),
                            ipId,
                            amount: amountIP,
                            type: "ip_owner",
                            txHash,
                            createdAt: new Date(),
                        });

                        console.log("[EarningsListener] ✅ Saved earning to DB and emitted socket event");
                    } catch (error) {
                        console.error("[EarningsListener] ❌ Error processing EarningAdded:", error);
                    }
                }
            },
            onError: error => {
                console.error("[EarningsListener] ❌ Error watching EarningAdded events:", error);
            },
        });

        // Listen for ProtocolEarningAdded events
        publicClient.watchContractEvent({
            address: EARNINGS_ADDRESS,
            abi: EARNINGS_ABI,
            eventName: "ProtocolEarningAdded",
            onLogs: async logs => {
                for (const log of logs) {
                    try {
                        const txHash = log.transactionHash;
                        if (!txHash || this.processedTxHashes.has(`protocol-${txHash}`)) {
                            continue;
                        }

                        this.processedTxHashes.add(`protocol-${txHash}`);

                        const { amount } = log.args as {
                            amount: bigint;
                        };

                        const amountIP = parseFloat(formatEther(amount));

                        console.log("[EarningsListener] 🏦 ProtocolEarningAdded:", {
                            amount: amountIP,
                            txHash,
                        });

                        await Earning.create({
                            wallet: "protocol",
                            ipId: "protocol",
                            type: "protocol",
                            amount: amountIP,
                            txHash,
                        });

                        console.log("[EarningsListener] ✅ Saved protocol earning to DB");
                    } catch (error) {
                        console.error("[EarningsListener] ❌ Error processing ProtocolEarningAdded:", error);
                    }
                }
            },
            onError: error => {
                console.error("[EarningsListener] ❌ Error watching ProtocolEarningAdded events:", error);
            },
        });

        console.log("[EarningsListener] ✅ Earnings listener started successfully");
    }
}

