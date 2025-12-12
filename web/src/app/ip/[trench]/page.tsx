"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, LineChart, Loader2, ShoppingCart, Wallet2, ImportIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { toast } from "sonner";
import { useWalletClient, useBalance } from "wagmi";
import { usePriceDataStore } from "@/store/priceDataStore";
import { VAULT_ABI } from "@/lib/abi/Vault";
import { parseEther, formatUnits } from "viem";
import Image from "next/image";
import { cn, formatMarketCap } from "@/lib/utils";
import Chart from "@/components/Chart";
import { useWindowStore } from "@/store/windowStore";
import CreateIPWindow from "@/components/CreateIPWindow";

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;

interface IPDetails {
    ipId: string;
    nftId: string;
    tx: string;
    type: string;
    user: string;
    createdAt: string;
    supply?: number;
    currentPrice?: number;
    reserve?: number;
}

interface NFTData {
    name: string;
    ticker: string;
    description: string;
    imageUrl: string;
}

interface TradeEvent {
    ipId: string;
    side: "buy" | "sell";
    amountTokens: number;
    total: number;
    price: number;
    wallet: string | null;
    createdAt: string;
    supply: number;
    reserve: number;
}

interface CandlestickData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export default function IPDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ipId = params?.trench as string;
    const { data: walletClient } = useWalletClient();
    const ipPriceUSD = usePriceDataStore(state => state.price);
    const { openWindow } = useWindowStore();
    
    const { data: balanceData } = useBalance({
        address: walletClient?.account?.address,
    });

    const [ip, setIp] = useState<IPDetails | null>(null);
    const [nft, setNft] = useState<NFTData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [amount, setAmount] = useState<string>("");
    const [price, setPrice] = useState<number | null>(null);
    const [supply, setSupply] = useState<number | null>(null);
    const [reserve, setReserve] = useState<number | null>(null);
    const [trades, setTrades] = useState<TradeEvent[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [chartData, setChartData] = useState<CandlestickData[]>([]);

    const parsedAmount = useMemo(() => Number(amount) || 0, [amount]);
    const estTotalIP = useMemo(() => {
        if (!price || parsedAmount <= 0) return 0;
        return parsedAmount * price;
    }, [parsedAmount, price]);
    const estTotalUSD = useMemo(() => {
        return estTotalIP * (ipPriceUSD || 1);
    }, [estTotalIP, ipPriceUSD]);

    const walletBalance = balanceData
        ? formatUnits(balanceData.value, balanceData.decimals)
        : "0";

    const setQuickAmount = (value: string) => {
        setAmount(value);
    };

    const handleCreateDerivative = () => {
        // Store parent IP ID in session storage
        sessionStorage.setItem("derivative_parent_ip", ipId);
        // Open the create IP window
        openWindow("create-ip", "Create IP Asset", <CreateIPWindow />);
    };

    useEffect(() => {
        if (!ipId) return;
        const run = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER}/ip/${ipId}`);
                if (!res.ok) throw new Error("Failed to load IP");
                const data = await res.json();
                setIp(data.ip);
                setNft(data.nft);
                setPrice(data.ip.currentPrice ?? null);
                setSupply(data.ip.supply ?? null);
                setReserve(data.ip.reserve ?? null);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load IP";
                setError(message);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [ipId]);

    // Memoize all socket event handlers to prevent useEffect re-runs
    const handlePrice = useCallback((data: { price: number; supply: number; reserve: number }) => {
        try {
            if (typeof data.price === "number" && isFinite(data.price)) {
                setPrice(data.price);
            }
            if (typeof data.supply === "number" && isFinite(data.supply)) {
                setSupply(data.supply);
            }
            if (typeof data.reserve === "number" && isFinite(data.reserve)) {
                setReserve(data.reserve);
            }
        } catch (error) {
            console.error("Error handling price update:", error);
        }
    }, []);

    const handleTrade = useCallback((t: TradeEvent) => {
        try {
            if (t && t.ipId) {
                setTrades(prev => [t, ...prev].slice(0, 100));
            }
        } catch (error) {
            console.error("Error handling trade event:", error);
        }
    }, []);

    const handleTrades = useCallback((list: TradeEvent[]) => {
        try {
            console.log("[IPDetailPage] Received trades:", list?.length || 0, list);
            if (Array.isArray(list)) {
                setTrades(list.slice(0, 100));
                console.log("[IPDetailPage] Set trades state:", list.length);
            } else {
                console.warn("[IPDetailPage] Trades data is not an array:", list);
            }
        } catch (error) {
            console.error("Error handling trades list:", error);
        }
    }, []);

    const handleChartData = useCallback((data: CandlestickData[]) => {
        try {
            if (Array.isArray(data) && data.length > 0) {
                // Validate data structure
                const validData = data.filter(candle => 
                    candle && 
                    candle.time && 
                    typeof candle.open === 'number' && 
                    typeof candle.high === 'number' && 
                    typeof candle.low === 'number' && 
                    typeof candle.close === 'number' &&
                    isFinite(candle.open) &&
                    isFinite(candle.high) &&
                    isFinite(candle.low) &&
                    isFinite(candle.close)
                );
                setChartData(validData);
            }
        } catch (error) {
            console.error("Error handling chart data:", error);
        }
    }, []);

    const handleChartUpdate = useCallback((candle: CandlestickData) => {
        try {
            console.log("📊 Received chart update:", candle);
            // Validate the candle data
            if (
                candle && 
                candle.time && 
                typeof candle.open === 'number' && 
                typeof candle.high === 'number' && 
                typeof candle.low === 'number' && 
                typeof candle.close === 'number' &&
                isFinite(candle.open) &&
                isFinite(candle.high) &&
                isFinite(candle.low) &&
                isFinite(candle.close)
            ) {
                setChartData(prev => {
                    // Prevent duplicates by checking if the last candle has the same time
                    if (prev.length > 0 && prev[prev.length - 1].time === candle.time) {
                        console.log("⚠️ Duplicate candle detected, skipping");
                        return prev;
                    }
                    const newData = [...prev, candle];
                    console.log("✅ Added new candle to chart. Total candles:", newData.length);
                    return newData;
                });
            } else {
                console.warn("❌ Invalid candle data received:", candle);
            }
        } catch (error) {
            console.error("Error handling chart update:", error);
        }
    }, []);

    const handleError = useCallback((payload: { message: string }) => {
        try {
            toast.error(payload?.message || "Trade error");
        } catch (error) {
            console.error("Error handling trade error:", error);
        }
    }, []);

    const handleChartError = useCallback((payload: { message: string }) => {
        console.error("Chart error:", payload?.message);
    }, []);

    useEffect(() => {
        if (!ipId) return;
        
        console.log("[IPDetailPage] Setting up socket for IP:", ipId, "Socket connected:", socket.connected);
        
        // Register socket listeners FIRST
        socket.on("price", handlePrice);
        socket.on("trade", handleTrade);
        socket.on("trades", handleTrades);
        socket.on("chart-data", handleChartData);
        socket.on("chart-update", handleChartUpdate);
        socket.on("trade-error", handleError);
        socket.on("chart-error", handleChartError);

        // Function to request data
        const requestData = () => {
            console.log("[IPDetailPage] Requesting data for IP:", ipId);
            socket.emit("join-ip", ipId);
            socket.emit("trades", { ipId, limit: 50 });
            socket.emit("chart-data", { ipId, limit: 100 });
        };

        // Request data immediately if connected, otherwise wait for connection
        if (socket.connected) {
            requestData();
        } else {
            console.log("[IPDetailPage] Socket not connected, waiting...");
            socket.once("connect", () => {
                console.log("[IPDetailPage] Socket connected, requesting data");
                requestData();
            });
        }

        // Cleanup function
        return () => {
            console.log("[IPDetailPage] Cleaning up socket for IP:", ipId);
            socket.emit("leave-ip", ipId);
            socket.off("price", handlePrice);
            socket.off("trade", handleTrade);
            socket.off("trades", handleTrades);
            socket.off("chart-data", handleChartData);
            socket.off("chart-update", handleChartUpdate);
            socket.off("trade-error", handleError);
            socket.off("chart-error", handleChartError);
        };
    }, [ipId, handlePrice, handleTrade, handleTrades, handleChartData, handleChartUpdate, handleError, handleChartError]);

    const doTrade = async (side: "buy" | "sell") => {
        if (!ipId) return;
        if (parsedAmount <= 0) {
            toast.error("Enter amount");
            return;
        }
        if (!walletClient || !walletClient.account) {
            toast.error("Connect your wallet first");
            return;
        }
        if (!VAULT_ADDRESS) {
            toast.error("Vault contract not configured");
            return;
        }

        try {
            setIsSubmitting(true);

            if (side === "buy") {
                // Convert amount to wei (1 token = 1e18 wei) to support decimals
                const amountInWei = parseEther(parsedAmount.toString());

                // Calculate cost in $IP tokens (wei)
                const costInIP = estTotalIP;
                const costInWei = parseEther(costInIP.toString());

                // Call buy function on Vault contract
                const txHash = await walletClient.writeContract({
                    address: VAULT_ADDRESS,
                    abi: VAULT_ABI,
                    functionName: "buy",
                    args: [ipId, amountInWei],
                    value: costInWei,
                });

                toast.success(`Buy transaction submitted: ${txHash.slice(0, 10)}...`);
            } else {
                // Convert amount to wei to support decimals
                const amountInWei = parseEther(parsedAmount.toString());

                // For sell, calculate expected refund
                const refundInIP = estTotalIP;
                const refundInWei = parseEther(refundInIP.toString());

                // Call sell function on Vault contract
                const txHash = await walletClient.writeContract({
                    address: VAULT_ADDRESS,
                    abi: VAULT_ABI,
                    functionName: "sell",
                    args: [ipId, amountInWei, refundInWei],
                });

                toast.success(`Sell transaction submitted: ${txHash.slice(0, 10)}...`);
            }

            // Clear amount input
            setAmount("");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Transaction failed";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-secondary-text"><Loader2 className="w-4 h-4 animate-spin" /></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-negative">{error}</div>
            </div>
        );
    }

    if (!ip) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-secondary-text">IP not found</div>
            </div>
        );
    }

    const marketCapIP = reserve || 0;
    const marketCapUSD = marketCapIP * (ipPriceUSD || 1);

    return (
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-7rem-2px)]">
            <div className="flex items-center gap-3 text-sm text-secondary-text">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-secondary-text hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <span className="text-muted-text">/</span>
                <span className="font-mono text-foreground">{ipId || "IP"}</span>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="h-full lg:col-span-2">
                    <div className="rounded-xl border border-border-subtle bg-card-bg p-4 h-full min-h-[420px] flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <LineChart className="w-4 h-4 text-primary" />
                                <h2 className="text-lg font-semibold">Price Action</h2>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <Chart data={chartData} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {nft && (
                        <div className="rounded-xl border border-border-subtle bg-card-bg p-4">
                            <div className="flex items-start gap-4">
                                {nft.imageUrl ? (
                                    <Image
                                        quality={100}
                                        src={nft.imageUrl}
                                        alt={nft.name}
                                        width={80}
                                        height={80}
                                        className="h-28 w-28 rounded-lg border-2 border-primary object-cover"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-lg border-2 border-primary bg-border-subtle flex items-center justify-center text-lg font-semibold">
                                        {nft.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-2xl font-bold">{nft.name}</h1>
                                        <span className="text-sm text-muted-text font-mono">
                                            ${nft.ticker}
                                        </span>
                                    </div>
                                    <p className="text-sm text-secondary-text mb-3 line-clamp-2">
                                        {nft.description}
                                    </p>
                                    <div className="flex flex-col text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-text">Market Cap (TVL):</span>
                                            <span className="font-semibold text-foreground">
                                                {marketCapIP.toFixed(2)} IP (
                                                {formatMarketCap(marketCapUSD)})
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-text">Price:</span>
                                            <span className="font-semibold text-foreground">
                                                {(price || 0).toFixed(4)} IP ($
                                                {((price || 0) * (ipPriceUSD || 1)).toFixed(4)})
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 rounded-xl border border-border-subtle bg-card-bg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-primary" />
                                <h3 className="text-base font-semibold">Trade</h3>
                            </div>
                            {price !== null && (
                                <div className="text-xs text-secondary-text">
                                    {price.toFixed(2)} IP (${(price * (ipPriceUSD || 1)).toFixed(4)}
                                    ) • Supply: {supply?.toFixed(2) ?? 0}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs text-muted-text mb-1">Amount (IP)</label>
                            <input
                                className="w-full rounded-lg rounded-b-none border border-border-subtle bg-background px-3 py-2 text-sm outline-0"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                inputMode="decimal"
                            />
                            <div className="flex items-center mb-2">
                                <button
                                    key="0.01"
                                    onClick={() => setQuickAmount("0.01")}
                                    className="flex-1 px-2 py-2 text-xs rounded-bl-lg bg-white/10 hover:bg-white/20 transition-colors text-foreground font-medium"
                                >
                                    {0.01}
                                </button>
                                {["0.05", "0.1", "0.5", "1", "5"].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setQuickAmount(val)}
                                        className="flex-1 px-2 py-2 text-xs bg-white/10 hover:bg-white/20 transition-colors text-foreground font-medium"
                                    >
                                        {val}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setQuickAmount(walletBalance)}
                                    className="flex-1 px-2 py-2 text-xs rounded-br-lg bg-white/10 hover:bg-white/20 transition-colors text-foreground font-medium"
                                >
                                    MAX
                                </button>
                            </div>
                            <div className="text-xs text-secondary-text">
                                Est. cost: {estTotalIP.toFixed(2)} IP (${estTotalUSD.toFixed(4)}) •
                                Reserve: {(reserve || 0).toFixed(2)} IP
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-text">Connected wallet</label>
                            <div className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-xs font-mono truncate">
                                {walletClient?.account?.address || "Not connected"}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="rounded-lg bg-positive text-background py-2 text-sm font-semibold hover:bg-positive/90 transition-colors disabled:opacity-60"
                                onClick={() => doTrade("buy")}
                                disabled={isSubmitting}
                            >
                                Buy
                            </button>
                            <button
                                className="rounded-lg bg-negative text-background py-2 text-sm font-semibold hover:bg-negative/90 transition-colors disabled:opacity-60"
                                onClick={() => doTrade("sell")}
                                disabled={isSubmitting}
                            >
                                Sell
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-lg border border-border-subtle bg-background px-3 py-3 space-y-1 text-sm break-all">
                            <div className="flex items-center gap-2 text-secondary-text text-xs uppercase tracking-wide">
                                <Wallet2 className="w-3 h-3" />
                                Asset Info
                            </div>
                            <div>
                                IP:{" "}
                                <a
                                    href={`https://aeneid.explorer.story.foundation/ipa/${ip.ipId}`}
                                    target="_blank"
                                    className="text-xs break-all text-primary"
                                >
                                    {ip.ipId}
                                </a>
                            </div>
                            <div className="text-xs">
                                NFT: <span className="text-secondary-text">{ip.nftId}</span>
                            </div>
                            <div>
                                TX:{" "}
                                <a
                                    href={`https://aeneid.explorer.story.foundation/transactions/${ip.tx}`}
                                    target="_blank"
                                    className="text-xs text-primary"
                                >
                                    {ip.tx}
                                </a>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateDerivative}
                            className="w-full px-4 py-2 bg-secondary-bg border border-border-subtle rounded-lg text-sm font-medium hover:bg-border-subtle transition-colors flex items-center justify-center gap-2"
                        >
                            <ImportIcon className="w-4 h-4" />
                            Create Derivative
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col rounded-xl border border-border-subtle bg-card-bg space-y-3 overflow-hidden">
                <div className="flex items-center justify-between text-sm p-4 pb-0">
                    <h3 className="font-semibold">Live Trades</h3>
                </div>
                <div className="overflow-y-auto flex-1">
                    {trades.length === 0 && (
                        <div className="text-xs text-secondary-text px-4">No trades yet.</div>
                    )}
                    {trades.map((t, idx) => {
                        const totalUSD = (t.total || 0) * (ipPriceUSD || 1);
                        return (
                            <div
                                key={`${t.createdAt}-${idx}`}
                                className={cn("flex items-center justify-between text-xs border-b border-border-subtle px-3 py-2 bg-background", idx === 0 ? "border-t" : "")}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`font-semibold ${
                                            t.side === "buy" ? "text-positive" : "text-negative"
                                        }`}
                                    >
                                        {t.side.toUpperCase()}
                                    </span>
                                    <span className="text-foreground">
                                        {(t.amountTokens || 0).toLocaleString()} IP
                                    </span>
                                </div>
                                <div className="text-right text-muted-text">
                                    <div className="text-primary">${totalUSD.toFixed(4)}</div>
                                    <div className="font-mono text-[10px]">
                                        {t.createdAt
                                            ? new Date(t.createdAt).toLocaleTimeString()
                                            : ""}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
