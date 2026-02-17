// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PizzaPaymaster
 * @dev Paymaster contract for sponsoring gas fees (ERC-4337)
 * This enables free gameplay for all users
 */
contract PizzaPaymaster is Ownable, ReentrancyGuard {
    
    // Sponsored operations tracking
    mapping(address => uint256) public sponsoredOpsCount;
    mapping(address => uint256) public totalGasSponsored;
    
    uint256 public maxGasPerOperation = 500000;
    uint256 public totalSponsored;
    
    event OperationSponsored(address indexed user, uint256 gasAmount);
    event PaymasterDeposited(address indexed depositor, uint256 amount);
    event PaymasterWithdrawn(address indexed recipient, uint256 amount);
    
    constructor() Ownable(msg.sender) payable {}
    
    /**
     * @dev Deposit funds to sponsor operations
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit positive amount");
        emit PaymasterDeposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Validate if paymaster can sponsor an operation
     */
    function validatePaymasterUserOp(
        address /* sender */,
        uint256 maxCost
    ) external view returns (bool) {
        // Check if paymaster has enough balance
        if (address(this).balance < maxCost) {
            return false;
        }
        
        // Check if operation is within gas limit
        if (maxCost > maxGasPerOperation) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Post operation - called after the operation is executed
     */
    function postOp(
        address user,
        uint256 actualGasCost
    ) external onlyOwner nonReentrant {
        sponsoredOpsCount[user]++;
        totalGasSponsored[user] += actualGasCost;
        totalSponsored += actualGasCost;
        
        emit OperationSponsored(user, actualGasCost);
    }
    
    /**
     * @dev Withdraw funds from paymaster (owner only)
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit PaymasterWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Get paymaster balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get user statistics
     */
    function getUserStats(address user) external view returns (
        uint256 opsCount,
        uint256 totalGas
    ) {
        return (sponsoredOpsCount[user], totalGasSponsored[user]);
    }
    
    /**
     * @dev Update max gas per operation
     */
    function setMaxGasPerOperation(uint256 newMax) external onlyOwner {
        maxGasPerOperation = newMax;
    }
    
    receive() external payable {
        emit PaymasterDeposited(msg.sender, msg.value);
    }
}
