// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PizzaSkyRace
 * @dev Main game contract for managing races on Monad
 */
contract PizzaSkyRace is Ownable, ReentrancyGuard {
    
    // Game Constants
    uint256 public constant RACE_DURATION = 60; // seconds
    uint256 public constant MAX_PLAYERS = 50; // Like Kahoot, support many players
    
    // Structs
    struct Race {
        uint256 raceId;
        uint256 startTime;
        uint256 endTime;
        address[] players;
        mapping(address => PlayerState) playerStates;
        bool isActive;
        address winner;
    }
    
    struct PlayerState {
        uint256 height;
        uint256 lastUpdateTime;
        bool hasBoost;
        bool hasGlue;
        uint256 boostEndTime;
        uint256 glueEndTime;
    }
    
    struct PlayerScore {
        address player;
        uint256 height;
    }
    
    // State Variables
    uint256 public currentRaceId;
    mapping(uint256 => Race) private races;
    mapping(address => uint256) public playerCurrentRace;
    
    // Events
    event RaceStarted(uint256 indexed raceId, uint256 startTime);
    event PlayerJoined(uint256 indexed raceId, address indexed player);
    event HeightUpdated(uint256 indexed raceId, address indexed player, uint256 height);
    event PowerUpApplied(uint256 indexed raceId, address indexed player, string powerUpType);
    event RaceEnded(uint256 indexed raceId, address winner, uint256 finalHeight);
    
    constructor() Ownable(msg.sender) {
        currentRaceId = 0;
    }
    
    /**
     * @dev Start a new race
     */
    function startNewRace() external onlyOwner returns (uint256) {
        currentRaceId++;
        Race storage newRace = races[currentRaceId];
        newRace.raceId = currentRaceId;
        newRace.startTime = block.timestamp;
        newRace.endTime = block.timestamp + RACE_DURATION;
        newRace.isActive = true;
        
        emit RaceStarted(currentRaceId, block.timestamp);
        return currentRaceId;
    }
    
    /**
     * @dev Join the current active race
     */
    function joinRace(uint256 raceId) external nonReentrant {
        Race storage race = races[raceId];
        
        require(race.isActive, "Race is not active");
        require(race.players.length < MAX_PLAYERS, "Race is full");
        require(block.timestamp < race.endTime, "Race has ended");
        require(playerCurrentRace[msg.sender] != raceId, "Already joined this race");
        
        race.players.push(msg.sender);
        playerCurrentRace[msg.sender] = raceId;
        
        PlayerState storage playerState = race.playerStates[msg.sender];
        playerState.height = 0;
        playerState.lastUpdateTime = block.timestamp;
        
        emit PlayerJoined(raceId, msg.sender);
    }
    
    /**
     * @dev Update player height during race
     */
    function updateHeight(uint256 raceId, uint256 newHeight) external nonReentrant {
        Race storage race = races[raceId];
        
        require(race.isActive, "Race is not active");
        require(playerCurrentRace[msg.sender] == raceId, "Not in this race");
        require(block.timestamp < race.endTime, "Race has ended");
        
        PlayerState storage playerState = race.playerStates[msg.sender];
        
        // Apply speed modifiers
        if (playerState.hasBoost && block.timestamp < playerState.boostEndTime) {
            newHeight = newHeight * 150 / 100; // 50% boost
        }
        
        if (playerState.hasGlue && block.timestamp < playerState.glueEndTime) {
            newHeight = newHeight * 50 / 100; // 50% slower
        }
        
        playerState.height = newHeight;
        playerState.lastUpdateTime = block.timestamp;
        
        emit HeightUpdated(raceId, msg.sender, newHeight);
    }
    
    /**
     * @dev Apply Pepperoni Boost power-up
     */
    function applyPepperoniBoost(uint256 raceId) external nonReentrant {
        Race storage race = races[raceId];
        
        require(race.isActive, "Race is not active");
        require(playerCurrentRace[msg.sender] == raceId, "Not in this race");
        require(block.timestamp < race.endTime, "Race has ended");
        
        PlayerState storage playerState = race.playerStates[msg.sender];
        playerState.hasBoost = true;
        playerState.boostEndTime = block.timestamp + 3;
        
        emit PowerUpApplied(raceId, msg.sender, "PepperoniBoost");
    }
    
    /**
     * @dev Apply Ananas Glue malus to a player
     */
    function applyAnanasGlue(uint256 raceId, address targetPlayer) external nonReentrant {
        Race storage race = races[raceId];
        
        require(race.isActive, "Race is not active");
        require(playerCurrentRace[msg.sender] == raceId, "Not in this race");
        require(block.timestamp < race.endTime, "Race has ended");
        
        PlayerState storage targetState = race.playerStates[targetPlayer];
        targetState.hasGlue = true;
        targetState.glueEndTime = block.timestamp + 3;
        
        emit PowerUpApplied(raceId, targetPlayer, "AnanasGlue");
    }
    
    /**
     * @dev End the race and determine winner
     */
    function endRace(uint256 raceId) external onlyOwner nonReentrant {
        Race storage race = races[raceId];
        
        require(race.isActive, "Race already ended");
        require(block.timestamp >= race.endTime, "Race not finished yet");
        
        race.isActive = false;
        
        // Find winner (highest height)
        address winner;
        uint256 maxHeight = 0;
        
        for (uint256 i = 0; i < race.players.length; i++) {
            address player = race.players[i];
            uint256 height = race.playerStates[player].height;
            
            if (height > maxHeight) {
                maxHeight = height;
                winner = player;
            }
        }
        
        race.winner = winner;
        
        emit RaceEnded(raceId, winner, maxHeight);
    }
    
    /**
     * @dev Get race information
     */
    function getRaceInfo(uint256 raceId) external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 playerCount,
        bool isActive,
        address winner
    ) {
        Race storage race = races[raceId];
        return (
            race.startTime,
            race.endTime,
            race.players.length,
            race.isActive,
            race.winner
        );
    }
    
    /**
     * @dev Get player state in a race
     */
    function getPlayerState(uint256 raceId, address player) external view returns (
        uint256 height,
        bool hasBoost,
        bool hasGlue,
        uint256 boostEndTime,
        uint256 glueEndTime
    ) {
        Race storage race = races[raceId];
        PlayerState storage state = race.playerStates[player];
        
        return (
            state.height,
            state.hasBoost,
            state.hasGlue,
            state.boostEndTime,
            state.glueEndTime
        );
    }
    
    /**
     * @dev Get all players in a race
     */
    function getRacePlayers(uint256 raceId) external view returns (address[] memory) {
        return races[raceId].players;
    }
    
    /**
     * @dev Get leaderboard for a race
     */
    function getLeaderboard(uint256 raceId) external view returns (PlayerScore[] memory) {
        Race storage race = races[raceId];
        uint256 playerCount = race.players.length;
        
        PlayerScore[] memory leaderboard = new PlayerScore[](playerCount);
        
        for (uint256 i = 0; i < playerCount; i++) {
            address player = race.players[i];
            leaderboard[i] = PlayerScore({
                player: player,
                height: race.playerStates[player].height
            });
        }
        
        // Simple bubble sort for leaderboard
        for (uint256 i = 0; i < playerCount; i++) {
            for (uint256 j = i + 1; j < playerCount; j++) {
                if (leaderboard[i].height < leaderboard[j].height) {
                    PlayerScore memory temp = leaderboard[i];
                    leaderboard[i] = leaderboard[j];
                    leaderboard[j] = temp;
                }
            }
        }
        
        return leaderboard;
    }
}
