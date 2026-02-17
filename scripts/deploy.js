const hre = require("hardhat");

async function main() {
    console.log("Deploying Pizza Sky Race contracts to Monad...");
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Deploy Paymaster first (needs funding)
    console.log("\n1. Deploying Paymaster...");
    const PizzaPaymaster = await hre.ethers.getContractFactory("PizzaPaymaster");
    const paymaster = await PizzaPaymaster.deploy({ value: hre.ethers.parseEther("1.0") });
    await paymaster.waitForDeployment();
    const paymasterAddress = await paymaster.getAddress();
    console.log("✅ Paymaster deployed to:", paymasterAddress);
    
    // Deploy Session Key Validator
    console.log("\n2. Deploying Session Key Validator...");
    const SessionKeyValidator = await hre.ethers.getContractFactory("SessionKeyValidator");
    const sessionKeyValidator = await SessionKeyValidator.deploy();
    await sessionKeyValidator.waitForDeployment();
    const sessionKeyValidatorAddress = await sessionKeyValidator.getAddress();
    console.log("✅ Session Key Validator deployed to:", sessionKeyValidatorAddress);
    
    // Deploy Main Game Contract
    console.log("\n3. Deploying Pizza Sky Race Game...");
    const PizzaSkyRace = await hre.ethers.getContractFactory("PizzaSkyRace");
    const game = await PizzaSkyRace.deploy();
    await game.waitForDeployment();
    const gameAddress = await game.getAddress();
    console.log("✅ Game Contract deployed to:", gameAddress);
    
    // Deploy NFT Contract
    console.log("\n4. Deploying Golden Slice NFT...");
    const GoldenSliceNFT = await hre.ethers.getContractFactory("GoldenSliceNFT");
    const nft = await GoldenSliceNFT.deploy();
    await nft.waitForDeployment();
    const nftAddress = await nft.getAddress();
    console.log("✅ NFT Contract deployed to:", nftAddress);
    
    // Start initial race
    console.log("\n5. Starting initial race...");
    const tx = await game.startNewRace();
    await tx.wait();
    console.log("✅ Initial race started!");
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log("-------------------");
    console.log("Game Contract:          ", gameAddress);
    console.log("Paymaster:              ", paymasterAddress);
    console.log("Session Key Validator:  ", sessionKeyValidatorAddress);
    console.log("NFT Contract:           ", nftAddress);
    console.log("\n" + "=".repeat(60));
    
    console.log("\n📝 Update your .env file with these addresses:");
    console.log(`GAME_CONTRACT_ADDRESS=${gameAddress}`);
    console.log(`PAYMASTER_CONTRACT_ADDRESS=${paymasterAddress}`);
    console.log(`SESSION_KEY_VALIDATOR_ADDRESS=${sessionKeyValidatorAddress}`);
    console.log(`NFT_CONTRACT_ADDRESS=${nftAddress}`);
    
    console.log("\n📝 Update your frontend .env file:");
    console.log(`VITE_GAME_CONTRACT_ADDRESS=${gameAddress}`);
    console.log(`VITE_PAYMASTER_ADDRESS=${paymasterAddress}`);
    console.log(`VITE_SESSION_KEY_VALIDATOR_ADDRESS=${sessionKeyValidatorAddress}`);
    console.log(`VITE_NFT_CONTRACT_ADDRESS=${nftAddress}`);
    
    // Verify contracts on explorer (if available)
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    try {
        console.log("\n6. Verifying contracts on block explorer...");
        
        await hre.run("verify:verify", {
            address: paymasterAddress,
            constructorArguments: []
        });
        
        await hre.run("verify:verify", {
            address: sessionKeyValidatorAddress,
            constructorArguments: []
        });
        
        await hre.run("verify:verify", {
            address: gameAddress,
            constructorArguments: []
        });
        
        await hre.run("verify:verify", {
            address: nftAddress,
            constructorArguments: []
        });
        
        console.log("✅ All contracts verified!");
    } catch (error) {
        console.log("⚠️  Contract verification failed (this is okay):", error.message);
    }
    
    console.log("\n🎮 Ready to race! Start the server and frontend.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
