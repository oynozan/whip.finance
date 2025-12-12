// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Earnings {
    address public owner;
    address public vaultContract;
    
    // Mapping: user => total earnings
    mapping(address => uint256) public userEarnings;
    
    // Mapping: user => withdrawn amount
    mapping(address => uint256) public userWithdrawn;
    
    // Protocol earnings (whip.finance)
    uint256 public protocolEarnings;
    uint256 public protocolWithdrawn;
    
    event EarningAdded(
        address indexed user,
        string ipId,
        uint256 amount,
        uint256 timestamp
    );
    
    event ProtocolEarningAdded(
        uint256 amount,
        uint256 timestamp
    );
    
    event Withdrawn(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event ProtocolWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyVault() {
        require(msg.sender == vaultContract, "Not vault contract");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set the vault contract address (can only be set once)
     * @param _vaultContract Address of the Vault contract
     */
    function setVaultContract(address _vaultContract) external onlyOwner {
        require(vaultContract == address(0), "Vault already set");
        require(_vaultContract != address(0), "Invalid address");
        vaultContract = _vaultContract;
    }
    
    /**
     * @dev Add earnings for IP owner (called by Vault contract)
     * @param user IP owner address
     * @param ipId IP asset ID
     */
    function addUserEarning(address user, string calldata ipId) external payable onlyVault {
        require(msg.value > 0, "Amount required");
        require(user != address(0), "Invalid user");
        
        userEarnings[user] += msg.value;
        
        emit EarningAdded(user, ipId, msg.value, block.timestamp);
    }
    
    /**
     * @dev Add protocol earnings (called by Vault contract)
     */
    function addProtocolEarning() external payable onlyVault {
        require(msg.value > 0, "Amount required");
        
        protocolEarnings += msg.value;
        
        emit ProtocolEarningAdded(msg.value, block.timestamp);
    }
    
    /**
     * @dev User withdraws their earnings
     */
    function withdraw() external {
        uint256 available = userEarnings[msg.sender] - userWithdrawn[msg.sender];
        require(available > 0, "No earnings to withdraw");
        require(address(this).balance >= available, "Insufficient contract balance");
        
        userWithdrawn[msg.sender] += available;
        
        (bool success, ) = msg.sender.call{value: available}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawn(msg.sender, available, block.timestamp);
    }
    
    /**
     * @dev Owner withdraws protocol earnings
     * @param to Recipient address
     */
    function withdrawProtocol(address payable to) external onlyOwner {
        uint256 available = protocolEarnings - protocolWithdrawn;
        require(available > 0, "No protocol earnings to withdraw");
        require(address(this).balance >= available, "Insufficient contract balance");
        require(to != address(0), "Invalid recipient");
        
        protocolWithdrawn += available;
        
        (bool success, ) = to.call{value: available}("");
        require(success, "Withdrawal failed");
        
        emit ProtocolWithdrawn(to, available, block.timestamp);
    }
    
    /**
     * @dev Get available earnings for a user
     * @param user User address
     */
    function getAvailableEarnings(address user) external view returns (uint256) {
        return userEarnings[user] - userWithdrawn[user];
    }
    
    /**
     * @dev Get available protocol earnings
     */
    function getAvailableProtocolEarnings() external view returns (uint256) {
        return protocolEarnings - protocolWithdrawn;
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
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

