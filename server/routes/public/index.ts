import { Router } from "express";

/* Routes */
import Ping from "./ping";
import NFT from "./nft";
import IP from "./ip";
import Earnings from "./earnings";

const router = Router();

router.use("/ping", Ping);
router.use("/nft", NFT);
router.use("/ip", IP);
router.use("/earnings", Earnings);

export default router;
