// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IEarnings {
    function addUserEarning(address user, string calldata ipId) external payable;
    function addProtocolEarning() external payable;
}

contract Vault {
    address public owner;
    address public earningsContract;
    
    // Fee constants (in basis points: 1% = 100, 0.5% = 50)
    uint256 public constant IP_OWNER_FEE = 100; // 1%
    uint256 public constant PROTOCOL_FEE = 50; // 0.5%
    uint256 public constant FEE_DENOMINATOR = 10000; // 100%
    
    // Mapping: user => ipId => token balance
    mapping(address => mapping(string => uint256)) public balances;
    
    // Mapping: ipId => total supply
    mapping(string => uint256) public totalSupply;
    
    // Mapping: ipId => owner address
    mapping(string => address) public ipOwners;
    
    event Buy(
        address indexed user,
        string ipId,
        uint256 amountTokens,
        uint256 amountPaid,
        uint256 timestamp
    );
    
    event Sell(
        address indexed user,
        string ipId,
        uint256 amountTokens,
        uint256 amountReceived,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set the earnings contract address (can only be set once)
     * @param _earningsContract Address of the Earnings contract
     */
    function setEarningsContract(address _earningsContract) external onlyOwner {
        require(earningsContract == address(0), "Earnings contract already set");
        require(_earningsContract != address(0), "Invalid address");
        earningsContract = _earningsContract;
    }
    
    /**
     * @dev Register IP owner (should be called when IP is first created)
     * @param ipId IP asset ID
     * @param ipOwner Owner of the IP asset
     */
    function registerIPOwner(string calldata ipId, address ipOwner) external {
        require(bytes(ipId).length > 0, "IP ID required");
        require(ipOwner != address(0), "Invalid owner address");
        require(ipOwners[ipId] == address(0), "IP already registered");
        
        ipOwners[ipId] = ipOwner;
    }
    
    /**
     * @dev Buy IP tokens
     * @param ipId The IP asset ID being purchased
     * @param amountTokens Number of tokens to buy
     */
    function buy(string calldata ipId, uint256 amountTokens) external payable {
        require(msg.value > 0, "Payment required");
        require(amountTokens > 0, "Amount must be greater than 0");
        require(bytes(ipId).length > 0, "IP ID required");
        require(ipOwners[ipId] != address(0), "IP not registered");
        
        // Calculate fees
        uint256 ipOwnerFee = (msg.value * IP_OWNER_FEE) / FEE_DENOMINATOR; // 1%
        uint256 protocolFee = (msg.value * PROTOCOL_FEE) / FEE_DENOMINATOR; // 0.5%
        
        // Transfer fees to Earnings contract if set
        if (earningsContract != address(0) && (ipOwnerFee > 0 || protocolFee > 0)) {
            IEarnings earnings = IEarnings(earningsContract);
            
            // Transfer IP owner fee
            if (ipOwnerFee > 0) {
                earnings.addUserEarning{value: ipOwnerFee}(ipOwners[ipId], ipId);
            }
            
            // Transfer protocol fee
            if (protocolFee > 0) {
                earnings.addProtocolEarning{value: protocolFee}();
            }
        }
        
        // Update user balance
        balances[msg.sender][ipId] += amountTokens;
        
        // Update total supply
        totalSupply[ipId] += amountTokens;
        
        emit Buy(msg.sender, ipId, amountTokens, msg.value, block.timestamp);
    }
    
    /**
     * @dev Sell IP tokens back to vault
     * @param ipId The IP asset ID being sold
     * @param amountTokens Number of tokens to sell
     * @param expectedRefund Expected refund amount (before fees)
     */
    function sell(string calldata ipId, uint256 amountTokens, uint256 expectedRefund) external {
        require(amountTokens > 0, "Amount must be greater than 0");
        require(bytes(ipId).length > 0, "IP ID required");
        require(balances[msg.sender][ipId] >= amountTokens, "Insufficient balance");
        require(ipOwners[ipId] != address(0), "IP not registered");
        
        // Calculate fees on the refund amount
        uint256 ipOwnerFee = (expectedRefund * IP_OWNER_FEE) / FEE_DENOMINATOR; // 1%
        uint256 protocolFee = (expectedRefund * PROTOCOL_FEE) / FEE_DENOMINATOR; // 0.5%
        uint256 netRefund = expectedRefund - ipOwnerFee - protocolFee;
        
        require(address(this).balance >= expectedRefund, "Insufficient vault balance");
        
        // Update user balance
        balances[msg.sender][ipId] -= amountTokens;
        
        // Update total supply
        totalSupply[ipId] -= amountTokens;
        
        // Transfer fees to Earnings contract if set
        if (earningsContract != address(0) && (ipOwnerFee > 0 || protocolFee > 0)) {
            IEarnings earnings = IEarnings(earningsContract);
            
            // Transfer IP owner fee
            if (ipOwnerFee > 0) {
                earnings.addUserEarning{value: ipOwnerFee}(ipOwners[ipId], ipId);
            }
            
            // Transfer protocol fee
            if (protocolFee > 0) {
                earnings.addProtocolEarning{value: protocolFee}();
            }
        }
        
        // Refund user (net amount after fees)
        (bool success, ) = msg.sender.call{value: netRefund}("");
        require(success, "Refund failed");
        
        emit Sell(msg.sender, ipId, amountTokens, netRefund, block.timestamp);
    }
    
    /**
     * @dev Get user's balance for a specific IP
     * @param user User address
     * @param ipId IP asset ID
     */
    function getBalance(address user, string calldata ipId) external view returns (uint256) {
        return balances[user][ipId];
    }
    
    /**
     * @dev Get total supply for a specific IP
     * @param ipId IP asset ID
     */
    function getTotalSupply(string calldata ipId) external view returns (uint256) {
        return totalSupply[ipId];
    }
    
    /**
     * @dev Get IP owner address
     * @param ipId IP asset ID
     */
    function getIPOwner(string calldata ipId) external view returns (address) {
        return ipOwners[ipId];
    }
    
    /**
     * @dev Get vault's native token balance
     */
    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @dev Fallback to receive native tokens
     */
    receive() external payable {}
}
