import dotenv from "dotenv";
import { defineConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    aeneid: {
      type: "http",
      chainType: "l1",
      url: process.env.AENEID_RPC_URL!,
      accounts: [process.env.PRIVATE_KEY!],
    }
  },
});
