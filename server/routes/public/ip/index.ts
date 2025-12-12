import { Router, Request, Response } from "express";
import StoryProtocol from "../../../lib/storyProtocol";
import IP from "../../../models/IP";
import NFT from "../../../models/NFT";
import Trade from "../../../models/Trade";
import Price from "../../../models/Price";
import { TradeEngine } from "../../../lib/tradeEngine";
import { VaultHelpers } from "../../../lib/vaultHelpers";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
    try {
        const { type, nftId, ipId, tx, wallet, parentIpId } = req.body;
        console.log("body", req.body);

        if (
            !type ||
            !nftId ||
            !ipId ||
            !tx ||
            !wallet ||
            !["new_minted", "derivative"].includes(type)
        ) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate parent IP ID for derivative assets
        if (type === "derivative" && !parentIpId) {
            return res.status(400).json({ error: "Parent IP ID required for derivative assets" });
        }

        const result = await StoryProtocol.validateTradableAsset(
            type as "new_minted" | "derivative",
            wallet,
            tx,
            ipId,
            type === "derivative" ? parentIpId : undefined,
        );

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // save to database
        const ip = await IP.create({
            user: wallet,
            ipId,
            tx,
            type,
            nftId,
            parentIpId: type === "derivative" ? parentIpId : undefined,
        });

        // Initialize price with 10 IP initial supply
        await TradeEngine.ensurePrice(ipId);

        // Register IP owner in Vault contract (async, don't block response)
        VaultHelpers.registerIPOwner(ipId, wallet).catch(error => {
            console.error(`[IP Register] Failed to register IP owner in Vault:`, error);
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Error validating IP:", error);
        return res.status(500).json({ error: "Failed to validate IP" });
    }
});

router.get("/:ipId", async (req: Request, res: Response) => {
    try {
        const { ipId } = req.params;
        if (!ipId) return res.status(400).json({ error: "Missing ipId" });

        const ip = await IP.findOne({ ipId });
        if (!ip) return res.status(404).json({ error: "IP not found" });

        let nft = null;
        if (ip.nftId) {
            nft = await NFT.findById(ip.nftId);
        }

        const priceDoc = await TradeEngine.ensurePrice(ipId);
        const price = priceDoc?.currentPrice ?? priceDoc?.basePrice ?? 0;
        const supply = priceDoc?.supply ?? 0;
        const reserve = priceDoc?.reserve ?? 0;

        return res.json({
            success: true,
            ip: { ...ip.toObject(), currentPrice: price, supply, reserve },
            nft,
        });
    } catch (error) {
        console.error("Error fetching IP:", error);
        return res.status(500).json({ error: "Failed to fetch IP" });
    }
});

router.get("/", async (req: Request, res: Response) => {
    try {
        const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
        const limit = Math.min(
            Math.max(parseInt((req.query.limit as string) || "20", 10), 1),
            100,
        );

        const skip = (page - 1) * limit;
        const [ips, total] = await Promise.all([
            IP.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            IP.countDocuments(),
        ]);

        // Fetch related NFTs for image/name
        const nftIds = ips.map(ip => ip.nftId);
        const nfts = await NFT.find({ _id: { $in: nftIds } });
        const prices = await Price.find({ ipId: { $in: ips.map(ip => ip.ipId) } });

        const nftMap = new Map<string, any>();
        nfts.forEach((n: any) => nftMap.set(n._id.toString(), n));

        const priceMap = new Map<string, any>();
        prices.forEach((p: any) => priceMap.set(p.ipId, p));

        // Ensure all IPs have price documents
        const missingPrices = ips.filter(ip => !priceMap.has(ip.ipId));
        if (missingPrices.length > 0) {
            await Promise.all(
                missingPrices.map(ip => TradeEngine.ensurePrice(ip.ipId)),
            );
            const newPrices = await Price.find({
                ipId: { $in: missingPrices.map(ip => ip.ipId) },
            });
            newPrices.forEach((p: any) => priceMap.set(p.ipId, p));
        }

        const enriched = ips.map(ip => {
            const nft = nftMap.get(ip.nftId) || null;
            const priceDoc = priceMap.get(ip.ipId);
            const supply = priceDoc?.supply ?? 500;
            const currentPrice = priceDoc?.currentPrice ?? priceDoc?.basePrice ?? 1;
            const reserve = priceDoc?.reserve ?? 0;
            return {
                ...ip.toObject(),
                nft,
                supply,
                currentPrice,
                reserve,
            };
        });

        const hasMore = page * limit < total;

        return res.json({ success: true, ips: enriched, total, hasMore, page, limit });
    } catch (error) {
        console.error("Error fetching IP list:", error);
        return res.status(500).json({ error: "Failed to fetch IP list" });
    }
});

// Migration endpoint to update existing prices to new bonding curve
router.post("/migrate-prices", async (req, res) => {
    try {
        const result = await Price.updateMany(
            {},
            {
                $set: {
                    supply: 10,
                    reserve: 0,
                    basePrice: 0.001,
                    slope: 0.01,
                    currentPrice: 0.101,
                },
            }
        );
        console.log(`[IP Migration] Updated ${result.modifiedCount} price records`);
        return res.json({ success: true, updated: result.modifiedCount });
    } catch (error) {
        console.error("Error migrating prices:", error);
        return res.status(500).json({ error: "Migration failed" });
    }
});

export default router;
