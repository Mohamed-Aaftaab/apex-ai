import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const config: HardhatUserConfig = {
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
  etherscan: {
    apiKey: {
      mantleSepolia: "any",
    },
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.sepolia.mantle.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz",
        },
      },
    ],
  },
};

export default config;
