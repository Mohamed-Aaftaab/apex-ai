import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  MANTLE_SEPOLIA_RPC, 
  APEX_REGISTRY_ADDRESS, 
  APEX_REGISTRY_ABI 
} from '../../../lib/constants';

export async function POST(request: Request) {
  try {
    const { botAddress, txHash, pattern, confidence } = await request.json();

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'Server private key not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(MANTLE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(APEX_REGISTRY_ADDRESS, APEX_REGISTRY_ABI, wallet);

    console.log(`🤖 AUTONOMOUS LOG: ${botAddress} (${pattern})...`);
    
    const tx = await contract.logBot(botAddress, txHash, pattern, confidence);
    
    // Wait for confirmation to ensure it actually lands on-chain
    const receipt = await tx.wait();

    if (receipt && receipt.status === 1) {
      return NextResponse.json({ 
        success: true, 
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      });
    } else {
      throw new Error('Transaction failed on-chain (reverted)');
    }

  } catch (error: any) {
    console.error('Autonomous logging failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
