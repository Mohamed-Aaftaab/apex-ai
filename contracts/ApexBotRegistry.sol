// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ApexBotRegistry
 * @dev On-chain ledger for the Apex.AI agent to log verified bot signatures
 *      detected on the Mantle network.
 * 
 * This fulfills the Mantle Turing Test Hackathon requirement for:
 * - On-chain benchmarking (all detections are publicly verifiable)
 * - Radical transparency (anyone can audit the detection history)
 * - Agent reputation (reporters build on-chain reputation)
 */
contract ApexBotRegistry {
    struct BotSignature {
        address botAddress;
        string txHash;
        string pattern;
        uint256 confidence;
        uint256 timestamp;
        address reporter;
    }

    // ── Governance ──
    address public owner;
    mapping(address => bool) public authorizedReporters;

    // ── Storage ──
    mapping(address => bool) public isVerifiedBot;
    BotSignature[] public ledger;
    
    // Agent reputation: reporter address => total bots logged
    mapping(address => uint256) public agentReputation;
    
    // Track unique bots per reporter
    mapping(address => mapping(address => bool)) private reporterBotMap;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: Owner only");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedReporters[msg.sender], "Not authorized: Reporter not whitelisted");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedReporters[msg.sender] = true;
    }

    function authorizeReporter(address _reporter) public onlyOwner {
        authorizedReporters[_reporter] = true;
    }

    function deauthorizeReporter(address _reporter) public onlyOwner {
        authorizedReporters[_reporter] = false;
    }

    // ── Events ──
    event BotLogged(
        address indexed botAddress, 
        string pattern, 
        uint256 confidence,
        address indexed reporter,
        uint256 indexed ledgerIndex
    );

    /**
     * @dev Log a detected bot signature to the on-chain registry.
     * @param _botAddress The address identified as a bot
     * @param _txHash The transaction hash where bot behavior was detected
     * @param _pattern The detection pattern (e.g., "SANDWICH_ATTACK", "HIGH_FREQ_SENDER")
     * @param _confidence The computed confidence score (0-100)
     */
    function logBot(
        address _botAddress, 
        string memory _txHash, 
        string memory _pattern, 
        uint256 _confidence
    ) public onlyAuthorized {
        require(_botAddress != address(0), "Invalid bot address");
        require(_confidence <= 100, "Confidence must be 0-100");

        BotSignature memory newBot = BotSignature({
            botAddress: _botAddress,
            txHash: _txHash,
            pattern: _pattern,
            confidence: _confidence,
            timestamp: block.timestamp,
            reporter: msg.sender
        });

        uint256 index = ledger.length;
        ledger.push(newBot);
        isVerifiedBot[_botAddress] = true;

        // Update reporter reputation
        agentReputation[msg.sender]++;
        reporterBotMap[msg.sender][_botAddress] = true;

        emit BotLogged(_botAddress, _pattern, _confidence, msg.sender, index);
    }

    /**
     * @dev Get the total number of logged bot signatures.
     */
    function getLedgerCount() public view returns (uint256) {
        return ledger.length;
    }

    /**
     * @dev Get the reputation score for a specific agent/reporter.
     */
    function getAgentReputation(address agent) public view returns (uint256) {
        return agentReputation[agent];
    }

    /**
     * @dev Fetch the most recent N bot signatures from the ledger.
     *      Returns fewer entries if the ledger has less than `count`.
     * @param count Maximum number of recent entries to return
     */
    function getRecentBots(uint256 count) public view returns (BotSignature[] memory) {
        uint256 total = ledger.length;
        if (count > total) count = total;
        
        BotSignature[] memory recent = new BotSignature[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = ledger[total - count + i];
        }
        return recent;
    }

    /**
     * @dev Check if a specific reporter has previously logged a specific bot.
     */
    function hasReporterLoggedBot(address reporter, address bot) public view returns (bool) {
        return reporterBotMap[reporter][bot];
    }

    /**
     * @dev Allow the contract to receive MNT for license fees.
     */
    receive() external payable {}

    /**
     * @dev Withdraw accumulated license fees to the owner.
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
