const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Pizza Sky Race", function () {
    let game, paymaster, sessionKey, nft;
    let owner, player1, player2;
    
    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();
        
        // Deploy contracts
        const PizzaSkyRace = await ethers.getContractFactory("PizzaSkyRace");
        game = await PizzaSkyRace.deploy();
        
        const PizzaPaymaster = await ethers.getContractFactory("PizzaPaymaster");
        paymaster = await PizzaPaymaster.deploy({ value: ethers.parseEther("1.0") });
        
        const SessionKeyValidator = await ethers.getContractFactory("SessionKeyValidator");
        sessionKey = await SessionKeyValidator.deploy();
        
        const GoldenSliceNFT = await ethers.getContractFactory("GoldenSliceNFT");
        nft = await GoldenSliceNFT.deploy();
    });
    
    describe("Race Management", function () {
        it("Should start a new race", async function () {
            const tx = await game.startNewRace();
            await tx.wait();
            
            const raceId = await game.currentRaceId();
            expect(raceId).to.equal(1);
            
            const raceInfo = await game.getRaceInfo(1);
            expect(raceInfo.isActive).to.be.true;
        });
        
        it("Should allow players to join race", async function () {
            await game.startNewRace();
            
            await game.connect(player1).joinRace(1);
            
            const raceInfo = await game.getRaceInfo(1);
            expect(raceInfo.playerCount).to.equal(1);
        });
        
        it("Should update player height", async function () {
            await game.startNewRace();
            await game.connect(player1).joinRace(1);
            
            await game.connect(player1).updateHeight(1, 100);
            
            const playerState = await game.getPlayerState(1, player1.address);
            expect(playerState.height).to.equal(100);
        });
    });
    
    describe("Power-ups", function () {
        it("Should apply Pepperoni Boost", async function () {
            await game.startNewRace();
            await game.connect(player1).joinRace(1);
            
            await game.connect(player1).applyPepperoniBoost(1);
            
            const playerState = await game.getPlayerState(1, player1.address);
            expect(playerState.hasBoost).to.be.true;
        });
    });
    
    describe("Session Keys", function () {
        it("Should create session key", async function () {
            await sessionKey.connect(player1).createSessionKey(player2.address, 90);
            
            const isValid = await sessionKey.isValidSessionKey(player1.address, player2.address);
            expect(isValid).to.be.true;
        });
    });
    
    describe("Paymaster", function () {
        it("Should have balance", async function () {
            const balance = await paymaster.getBalance();
            expect(balance).to.equal(ethers.parseEther("1.0"));
        });
        
        it("Should validate operation", async function () {
            // Test with a reasonable gas amount (300000 wei, less than the 500000 max)
            const isValid = await paymaster.validatePaymasterUserOp(
                player1.address,
                300000
            );
            expect(isValid).to.be.true;
        });
    });
    
    describe("NFT Rewards", function () {
        it("Should mint Golden Slice to winner", async function () {
            const tx = await nft.mintToWinner(player1.address, 1, 500);
            await tx.wait();
            
            const balance = await nft.balanceOf(player1.address);
            expect(balance).to.equal(1);
        });
    });
});
