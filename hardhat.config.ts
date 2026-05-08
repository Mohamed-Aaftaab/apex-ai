import { defineConfig } from "hardhat/config";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("@nomicfoundation/hardhat-ethers");
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mantleSepolia: {
      type: "http",
      url: "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: (() => {
        const pk = process.env.DEPLOYER_PRIVATE_KEY?.trim();
        if (!pk) return [];
        const cleanPk = pk.startsWith("0x") ? pk : `0x${pk}`;
        return [cleanPk];
      })(),
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts-hardhat",
    cache: "./cache-hardhat",
  },
});
