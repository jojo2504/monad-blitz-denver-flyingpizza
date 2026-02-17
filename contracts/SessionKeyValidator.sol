// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SessionKeyValidator
 * @dev Validates session keys for ERC-4337 account abstraction
 */
contract SessionKeyValidator is Ownable {
    
    struct SessionKey {
        address sessionKey;
        uint256 expiresAt;
        bool isActive;
    }
    
    // Mapping from user address to their session keys
    mapping(address => mapping(address => SessionKey)) public sessionKeys;
    
    event SessionKeyCreated(address indexed user, address indexed sessionKey, uint256 expiresAt);
    event SessionKeyRevoked(address indexed user, address indexed sessionKey);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new session key for a user
     * @param sessionKey The address of the session key
     * @param duration Duration in seconds (default 90 seconds)
     */
    function createSessionKey(address sessionKey, uint256 duration) external {
        require(duration <= 300, "Duration too long"); // Max 5 minutes
        
        uint256 expiresAt = block.timestamp + duration;
        
        sessionKeys[msg.sender][sessionKey] = SessionKey({
            sessionKey: sessionKey,
            expiresAt: expiresAt,
            isActive: true
        });
        
        emit SessionKeyCreated(msg.sender, sessionKey, expiresAt);
    }
    
    /**
     * @dev Validate if a session key is valid for a user
     */
    function isValidSessionKey(address user, address sessionKey) external view returns (bool) {
        SessionKey memory session = sessionKeys[user][sessionKey];
        
        return session.isActive && 
               session.expiresAt > block.timestamp &&
               session.sessionKey == sessionKey;
    }
    
    /**
     * @dev Revoke a session key
     */
    function revokeSessionKey(address sessionKey) external {
        SessionKey storage session = sessionKeys[msg.sender][sessionKey];
        require(session.isActive, "Session key not active");
        
        session.isActive = false;
        
        emit SessionKeyRevoked(msg.sender, sessionKey);
    }
    
    /**
     * @dev Get session key details
     */
    function getSessionKey(address user, address sessionKey) external view returns (
        uint256 expiresAt,
        bool isActive
    ) {
        SessionKey memory session = sessionKeys[user][sessionKey];
        return (session.expiresAt, session.isActive);
    }
}
