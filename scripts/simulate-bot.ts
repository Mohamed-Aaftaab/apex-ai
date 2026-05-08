/**
 * Apex.AI — Bot Behavior Simulator for Mantle Sepolia
 * ====================================================
 * 
 * This script generates REAL on-chain transactions that mimic bot behavior.
 * Your detection engine then identifies them — all verifiable on Mantlescan.
 * 
 * This is standard practice for security/detection tools: you simulate the
 * attack vector to prove your detection works.
 * 
 * What it does:
 *   1. Sends rapid-fire transactions from the same address (triggers HIGH_FREQ_SENDER)
 *   2. Sends transactions with inflated gas prices (triggers GAS_ANOMALY)
 *   3. Sends multiple txs in quick succession targeting the same block (triggers frequency + pattern)
 * 
 * Usage:
 *   1. Add your private key to .env.local:
 *      DEPLOYER_PRIVATE_KEY=0x...
 *   
 *   2. Make sure the wallet has testnet MNT:
 *      https://faucet.sepolia.mantle.xyz
 * 
 *   3. Run:
 *      npx tsx scripts/simulate-bot.ts
 * 
 *   4. Watch the dashboard — detections should appear within 10-30 seconds
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const RPC_URL = 'https://rpc.sepolia.mantle.xyz';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ Missing DEPLOYER_PRIVATE_KEY in .env.local');
  console.error('   Add: DEPLOYER_PRIVATE_KEY=0x...');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// A dead-end burn address to send tiny amounts to
const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

async function main() {
  const address = wallet.address;
  const balance = await provider.getBalance(address);
  
  console.log('🤖 APEX.AI BOT SIMULATOR');
  console.log('========================');
  console.log(`Address:  ${address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} MNT`);
  console.log(`Network:  Mantle Sepolia (5003)`);
  console.log(`Explorer: https://sepolia.mantlescan.xyz/address/${address}`);
  console.log('');

  if (balance < ethers.parseEther('0.01')) {
    console.error('❌ Insufficient balance. Need at least 0.01 MNT.');
    console.error('   Get testnet MNT: https://faucet.sepolia.mantle.xyz');
    process.exit(1);
  }

  // ── Simulation 1: High-Frequency Burst ──────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 SIMULATION 1: High-Frequency Transaction Burst');
  console.log('   Sending 5 rapid transactions to trigger HIGH_FREQ_SENDER');
  console.log('');

  const txHashes: string[] = [];

  for (let i = 0; i < 5; i++) {
    try {
      const tx = await wallet.sendTransaction({
        to: BURN_ADDRESS,
        value: ethers.parseEther('0.0001'),
        // Use slightly different nonce handling to allow rapid sends
      });

      txHashes.push(tx.hash);
      console.log(`   TX ${i + 1}/5: ${tx.hash}`);
      console.log(`            https://sepolia.mantlescan.xyz/tx/${tx.hash}`);
      
      // Wait for confirmation before sending next (to avoid nonce issues)
      await tx.wait();
      
      // Small delay between transactions
      await sleep(2000);
    } catch (err: any) {
      console.error(`   TX ${i + 1} failed: ${err.message?.substring(0, 80)}`);
    }
  }

  console.log('');
  console.log(`   ✅ Sent ${txHashes.length} rapid transactions`);
  console.log('');

  // ── Simulation 2: Gas Price Spike ───────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⛽ SIMULATION 2: Gas Price Anomaly');
  console.log('   Sending transaction with 5x inflated gas price');
  console.log('');

  try {
    const feeData = await provider.getFeeData();
    const normalGas = feeData.gasPrice || ethers.parseUnits('0.05', 'gwei');
    const inflatedGas = normalGas * 5n; // 5x normal gas

    console.log(`   Normal gas:   ${ethers.formatUnits(normalGas, 'gwei')} gwei`);
    console.log(`   Inflated gas: ${ethers.formatUnits(inflatedGas, 'gwei')} gwei`);

    const tx = await wallet.sendTransaction({
      to: BURN_ADDRESS,
      value: ethers.parseEther('0.0002'),
      gasPrice: inflatedGas,
    });

    console.log(`   TX: ${tx.hash}`);
    console.log(`       https://sepolia.mantlescan.xyz/tx/${tx.hash}`);
    await tx.wait();
    console.log('   ✅ High-gas transaction confirmed');
  } catch (err: any) {
    console.error(`   Failed: ${err.message?.substring(0, 80)}`);
  }

  console.log('');

  // ── Simulation 3: Another rapid burst ──────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 SIMULATION 3: Second Frequency Burst');
  console.log('   Sending 3 more rapid transactions');
  console.log('');

  for (let i = 0; i < 3; i++) {
    try {
      const tx = await wallet.sendTransaction({
        to: BURN_ADDRESS,
        value: ethers.parseEther('0.0001'),
      });

      console.log(`   TX ${i + 1}/3: ${tx.hash}`);
      await tx.wait();
      await sleep(1500);
    } catch (err: any) {
      console.error(`   TX ${i + 1} failed: ${err.message?.substring(0, 80)}`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SIMULATION COMPLETE');
  console.log('');
  console.log('Your Apex.AI dashboard should now detect these patterns:');
  console.log('  • HIGH_FREQ_SENDER — same address in multiple blocks');
  console.log('  • GAS_ANOMALY — 5x gas price spike');
  console.log('');
  console.log('All transactions are REAL and verifiable on Mantlescan:');
  console.log(`  https://sepolia.mantlescan.xyz/address/${address}`);
  console.log('');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Simulation failed:', err);
    process.exit(1);
  });
