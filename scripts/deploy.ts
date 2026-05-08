/**
 * Apex.AI — Deploy ApexBotRegistry to Mantle Sepolia (ESM Robust Version)
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const hre = await import("hardhat");
  console.log("🚀 Deploying ApexBotRegistry to Mantle Sepolia...\n");

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found in .env.local. Make sure you added it!");
  }

  const cleanPk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  
  // Use manual provider to bypass Hardhat ESM plugin issues
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz");
  const wallet = new ethers.Wallet(cleanPk, provider);
  
  const address = await wallet.getAddress();
  console.log("Deployer address:", address);

  const balance = await provider.getBalance(address);
  console.log("Deployer balance:", ethers.formatEther(balance), "MNT\n");

  if (balance === 0n) {
    console.error("❌ Deployer has 0 MNT. Get testnet MNT from:");
    console.error("   https://faucet.sepolia.mantle.xyz");
    process.exit(1);
  }

  // Get contract artifact from Hardhat
  const artifact = await hre.artifacts.readArtifact("ApexBotRegistry");
  
  // Deploy using standard ethers logic
  console.log("Wait... Broadcasting transaction...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const registry = await factory.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  
  console.log("✅ ApexBotRegistry deployed!");
  console.log("   Contract address:", contractAddress);
  console.log("   Mantlescan:", `https://sepolia.mantlescan.xyz/address/${contractAddress}`);
  console.log("\n📋 IMPORTANT — Update your constants file:");
  console.log(`   In app/lib/constants.ts, set:`);
  console.log(`   export const APEX_REGISTRY_ADDRESS = '${contractAddress}';`);
  console.log("\n   Then restart the dev server.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
