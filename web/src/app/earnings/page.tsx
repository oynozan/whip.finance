"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Coins, TrendingUp, Wallet2, ExternalLink, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePriceDataStore } from "@/store/priceDataStore";
import { useWalletClient, usePublicClient } from "wagmi";
import { EARNINGS_ABI } from "@/lib/abi/Earnings";
import { toast } from "sonner";
import { formatEther } from "viem";

const EARNINGS_ADDRESS = process.env.NEXT_PUBLIC_EARNINGS_ADDRESS as `0x${string}`;

interface EarningRecord {
    _id: string;
    wallet: string;
    ipId: string;
    type: "ip_owner" | "protocol";
    amount: number;
    txHash: string;
    createdAt: string;
    ip?: {
        ipId: string;
        nftId: string;
    };
    nft?: {
        name: string;
        ticker: string;
        imageUrl: string;
    };
}

interface EarningsSummary {
    totalEarnings: number;
    earningsCount: number;
    topEarningIPs: Array<{
        _id: string;
        total: number;
        count: number;
    }>;
}

export default function EarningsPage() {
    const { primaryWallet } = useDynamicContext();
    const ipPriceUSD = usePriceDataStore(state => state.price);
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const [earnings, setEarnings] = useState<EarningRecord[]>([]);
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [availableEarnings, setAvailableEarnings] = useState<bigint>(BigInt(0));
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const walletAddress = primaryWallet?.address;

    useEffect(() => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);

                const earningsRes = await fetch(
                    `${process.env.NEXT_PUBLIC_SERVER}/earnings/user/${walletAddress}?page=${page}&limit=20`,
                );
                const earningsData = await earningsRes.json();

                if (earningsData.success) {
                    if (page === 1) {
                        setEarnings(earningsData.earnings);
                    } else {
                        setEarnings(prev => [...prev, ...earningsData.earnings]);
                    }
                    setHasMore(earningsData.hasMore);
                }

                if (page === 1) {
                    const summaryRes = await fetch(
                        `${process.env.NEXT_PUBLIC_SERVER}/earnings/summary/${walletAddress}`,
                    );
                    const summaryData = await summaryRes.json();

                    if (summaryData.success) {
                        setSummary(summaryData.summary);
                    }
                }
            } catch (error) {
                console.error("Error fetching earnings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [walletAddress, page]);

    useEffect(() => {
        const fetchAvailableEarnings = async () => {
            if (!walletAddress || !publicClient || !EARNINGS_ADDRESS) return;

            try {
                const available = await publicClient.readContract({
                    address: EARNINGS_ADDRESS,
                    abi: EARNINGS_ABI,
                    functionName: "getAvailableEarnings",
                    args: [walletAddress as `0x${string}`],
                });
                setAvailableEarnings(available as bigint);
            } catch (error) {
                console.error("Error fetching available earnings:", error);
            }
        };

        fetchAvailableEarnings();
        const interval = setInterval(fetchAvailableEarnings, 10000);
        return () => clearInterval(interval);
    }, [walletAddress, publicClient]);

    const handleWithdraw = async () => {
        if (!walletClient || !walletClient.account || !EARNINGS_ADDRESS) {
            toast.error("Please connect your wallet");
            return;
        }

        if (availableEarnings === BigInt(0)) {
            toast.error("No earnings available to withdraw");
            return;
        }

        try {
            setIsWithdrawing(true);
            toast.info("Initiating withdrawal...");

            const txHash = await walletClient.writeContract({
                address: EARNINGS_ADDRESS,
                abi: EARNINGS_ABI,
                functionName: "withdraw",
            });

            toast.success(`Withdrawal submitted! TX: ${txHash.slice(0, 10)}...`);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: txHash });
                toast.success("Withdrawal completed!");
                setAvailableEarnings(BigInt(0));
                setPage(1);
            }
        } catch (error) {
            console.error("Withdrawal error:", error);
            const message = error instanceof Error ? error.message : "Withdrawal failed";
            toast.error(message);
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (!walletAddress) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Wallet2 className="w-12 h-12 text-muted-text mx-auto" />
                    <p className="text-secondary-text">Connect your wallet to view earnings</p>
                </div>
            </div>
        );
    }

    if (loading && page === 1) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-secondary-text">Loading earnings...</div>
            </div>
        );
    }

    const totalEarningsUSD = (summary?.totalEarnings || 0) * (ipPriceUSD || 1);
    const availableEarningsIP = parseFloat(formatEther(availableEarnings));
    const availableEarningsUSD = availableEarningsIP * (ipPriceUSD || 1);

    return (
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-7rem-2px)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Coins className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold">Earnings</h1>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border-subtle bg-card-bg p-4">
                    <div className="flex items-center gap-2 text-secondary-text text-sm mb-2">
                        <TrendingUp className="w-4 h-4" />
                        Total Earnings
                    </div>
                    <div className="text-2xl font-bold">
                        {(summary?.totalEarnings || 0).toFixed(4)} IP
                    </div>
                    <div className="text-sm text-muted-text">
                        ${totalEarningsUSD.toFixed(2)} USD
                    </div>
                </div>

                <div className="rounded-xl border border-border-subtle bg-card-bg p-4">
                    <div className="flex items-center gap-2 text-secondary-text text-sm mb-2">
                        <Coins className="w-4 h-4" />
                        Total Transactions
                    </div>
                    <div className="text-2xl font-bold">{summary?.earningsCount || 0}</div>
                    <div className="text-sm text-muted-text">
                        {summary?.topEarningIPs?.length || 0} unique IPs
                    </div>
                </div>

                <div className="rounded-xl border border-border-subtle bg-card-bg p-4">
                    <div className="flex items-center gap-2 text-secondary-text text-sm mb-2">
                        <Wallet2 className="w-4 h-4" />
                        Average per Transaction
                    </div>
                    <div className="text-2xl font-bold">
                        {summary?.earningsCount
                            ? ((summary.totalEarnings || 0) / summary.earningsCount).toFixed(4)
                            : "0.0000"}{" "}
                        IP
                    </div>
                    <div className="text-sm text-muted-text">
                        $
                        {summary?.earningsCount
                            ? (
                                  ((summary.totalEarnings || 0) / summary.earningsCount) *
                                  (ipPriceUSD || 1)
                              ).toFixed(2)
                            : "0.00"}{" "}
                        USD
                    </div>
                </div>
            </div>

            {/* Withdraw Section */}
            <div className="rounded-xl border border-border-subtle bg-card-bg p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Download className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">Available to Withdraw</h2>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <div className="text-3xl font-bold text-primary">
                                {availableEarningsIP.toFixed(4)} IP
                            </div>
                            <div className="text-lg text-muted-text">
                                ${availableEarningsUSD.toFixed(2)} USD
                            </div>
                        </div>
                        <p className="text-sm text-secondary-text mt-2">
                            Withdraw your accumulated earnings from IP asset trades
                        </p>
                    </div>

                    <button
                        onClick={handleWithdraw}
                        disabled={isWithdrawing || availableEarnings === BigInt(0) || !walletClient}
                        className="px-6 py-3 bg-primary text-background rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isWithdrawing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                Withdrawing...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Withdraw
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Earnings History */}
            <div className="rounded-xl border border-border-subtle bg-card-bg p-4 space-y-4">
                <h2 className="text-lg font-semibold">Earnings History</h2>

                {earnings.length === 0 ? (
                    <div className="text-center py-12 text-secondary-text">
                        <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No earnings yet</p>
                        <p className="text-sm text-muted-text mt-1">
                            Create IP assets to start earning from trades
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {earnings.map(earning => {
                            const earningUSD = earning.amount * (ipPriceUSD || 1);
                            return (
                                <div
                                    key={earning._id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-background hover:bg-secondary-bg transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        {earning.nft?.imageUrl ? (
                                            <Image
                                                src={earning.nft.imageUrl}
                                                alt={earning.nft.name}
                                                width={40}
                                                height={40}
                                                className="w-10 h-10 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-border-subtle flex items-center justify-center text-xs font-semibold">
                                                {earning.ipId.slice(0, 2)}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/ip/${earning.ipId}`}
                                                    className="font-medium hover:text-primary transition-colors truncate"
                                                >
                                                    {earning.nft?.name || earning.ipId.slice(0, 8)}
                                                </Link>
                                                {earning.nft?.ticker && (
                                                    <span className="text-xs text-muted-text font-mono">
                                                        ${earning.nft.ticker}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-secondary-text">
                                                {new Date(earning.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-semibold text-positive">
                                                +{earning.amount.toFixed(4)} IP
                                            </div>
                                            <div className="text-xs text-muted-text">
                                                ${earningUSD.toFixed(4)}
                                            </div>
                                        </div>

                                        <a
                                            href={`https://aeneid.explorer.story.foundation/transactions/${earning.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}

                        {hasMore && (
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={loading}
                                className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                            >
                                {loading ? "Loading..." : "Load More"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
