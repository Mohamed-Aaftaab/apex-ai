# APEX.AI // Mantle Bot-Hunter Engine

**APEX.AI** is an autonomous agentic "immune system" for the Mantle Network. It performs real-time, block-by-block analysis of network traffic to identify, flag, and register malicious bot activity (MEV, sandwiching, spamming) onto a global on-chain registry.

### 🏆 Hackathon Tracks
- **Alpha & Data Track**: Unlocking value through real-time anomaly detection.
- **Best UI/UX**: Institutional-grade cyberpunk terminal.
- **Agentic AI**: Fully autonomous server-side signing and decision making.

---

### 🚀 Key Features
- **Agentic Autonomy**: Unlike traditional tools, APEX.AI operates as a "Zero-Click" agent. It uses server-side signing via Ethers.js to log detections on-chain without requiring manual user approval for every action.
- **Real-Time Heuristic Intelligence**: Scans every transaction in every block for specific bot signatures:
  - `HIGH_FREQ_SENDER`: Pattern recognition for transaction spamming.
  - `CONTRACT_SPAMMER`: Detecting malicious automated contract interactions.
  - `SANDWICH_PROBABLE`: Identifying potential MEV exploitation.
- **Global Bot Registry**: Detections are permanent and transparent, recorded on the Mantle Sepolia network for other protocols to query as a "Trust Score."

---

### 🛠️ Technical Architecture
- **Frontend**: Next.js 16 (Turbopack), TailwindCSS, Lucide-Icons.
- **Backend**: Next.js Server Actions & API Routes for secure transaction signing.
- **Blockchain**: 
  - **Scanning**: Mantle Mainnet (JSON-RPC).
  - **Registry**: Mantle Sepolia (Smart Contracts).
- **Security**: Server-side signing uses `DEPLOYER_PRIVATE_KEY` in a secure environment to prevent private key exposure.

---

### 📦 Deployment Details
- **Registry Contract (Mantle Sepolia)**: `0x4dF55A7e1D5163511Bf52CD05F1a8FFe8c7c42Ae`
- **Network**: Mantle Network
- **Status**: Production-Ready / Agentic Mode Enabled

---

### 💻 Installation & Setup
1. **Clone the Repo**:
   ```bash
   git clone <your-repo-url>
   cd apex-ui
   ```
2. **Environment Variables**: Create a `.env.local`:
   ```env
   DEPLOYER_PRIVATE_KEY=your_key_here
   ```
3. **Run the Engine**:
   ```bash
   npm install
   npm run dev
   ```

---

### 🛡️ Why APEX.AI Matters for Mantle
Malicious bots drain yield from RWA holders (USDY/mETH) and increase gas costs for regular users. APEX.AI provides the transparency needed to identify these actors and ensure Mantle remains the most human-friendly L2.
