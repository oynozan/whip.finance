import { Router } from "express";
import Earning from "../../../models/Earning";
import IP from "../../../models/IP";
import NFT from "../../../models/NFT";

const router = Router();

// Get user earnings history
router.get("/user/:wallet", async (req, res) => {
    try {
        const { wallet } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        if (!wallet) {
            return res.status(400).json({ error: "Wallet address required" });
        }

        const normalizedWallet = wallet.toLowerCase();

        // Get earnings with pagination
        const earnings = await Earning.find({ wallet: normalizedWallet, type: "ip_owner" })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Earning.countDocuments({ wallet: normalizedWallet, type: "ip_owner" });

        // Calculate total earnings
        const totalEarnings = await Earning.aggregate([
            { $match: { wallet: normalizedWallet, type: "ip_owner" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        // Enrich earnings with IP and NFT data
        const enriched = await Promise.all(
            earnings.map(async earning => {
                const ip = await IP.findOne({ ipId: earning.ipId }).lean();
                let nft = null;
                if (ip?.nftId) {
                    nft = await NFT.findById(ip.nftId).lean();
                }
                return {
                    ...earning,
                    ip,
                    nft,
                };
            }),
        );

        const hasMore = page * limit < total;

        return res.json({
            success: true,
            earnings: enriched,
            total,
            totalEarnings: totalEarnings[0]?.total || 0,
            hasMore,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error fetching user earnings:", error);
        return res.status(500).json({ error: "Failed to fetch earnings" });
    }
});

// Get earnings for a specific IP
router.get("/ip/:ipId", async (req, res) => {
    try {
        const { ipId } = req.params;

        if (!ipId) {
            return res.status(400).json({ error: "IP ID required" });
        }

        const earnings = await Earning.find({ ipId, type: "ip_owner" })
            .sort({ createdAt: -1 })
            .lean();

        const totalEarnings = await Earning.aggregate([
            { $match: { ipId, type: "ip_owner" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        return res.json({
            success: true,
            earnings,
            totalEarnings: totalEarnings[0]?.total || 0,
        });
    } catch (error) {
        console.error("Error fetching IP earnings:", error);
        return res.status(500).json({ error: "Failed to fetch earnings" });
    }
});

// Get earnings summary for a wallet
router.get("/summary/:wallet", async (req, res) => {
    try {
        const { wallet } = req.params;

        if (!wallet) {
            return res.status(400).json({ error: "Wallet address required" });
        }

        const normalizedWallet = wallet.toLowerCase();

        // Total earnings
        const totalEarnings = await Earning.aggregate([
            { $match: { wallet: normalizedWallet, type: "ip_owner" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        // Earnings count
        const earningsCount = await Earning.countDocuments({ wallet: normalizedWallet, type: "ip_owner" });

        // Earnings by IP
        const earningsByIP = await Earning.aggregate([
            { $match: { wallet: normalizedWallet, type: "ip_owner" } },
            { $group: { _id: "$ipId", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 10 },
        ]);

        return res.json({
            success: true,
            summary: {
                totalEarnings: totalEarnings[0]?.total || 0,
                earningsCount,
                topEarningIPs: earningsByIP,
            },
        });
    } catch (error) {
        console.error("Error fetching earnings summary:", error);
        return res.status(500).json({ error: "Failed to fetch summary" });
    }
});

export default router;

