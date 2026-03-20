const {ethers} = require("hardhat");
 
async function main(){
    const [deployer]  = await ethers.getSigners();
    console.log(`deploying...deployer: ${deployer.address}`);

    const tokenFactory = await ethers.getContractFactory("ChauncyFishingToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();
    console.log(`contract ChauncyFishingToken has been deployed to address: ${token.target}`);


    const fishFactory = await ethers.getContractFactory("ChauncyFishNFT");
    const nft = await fishFactory.deploy();
    await nft.waitForDeployment();
    console.log(`contract ChauncyFishNFT has been deployed to address: ${nft.target}`);

    const pondFactory = await ethers.getContractFactory("ChauncyPond");
    const pond = await pondFactory.deploy(token.target, nft.target);
    await pond.waitForDeployment();
    console.log(`contract ChauncyPond has been deployed to address: ${pond.target}`);

    const mter = await nft.setMinter(pond.target);
    await mter.wait();
    console.log("The NFT minting rights have been configured.");


    console.log(" Setting fish prices...");
    const prices = [
      "2", "2",
      "4", "4", "4",
      "15", "15",
      "40", "40", "40",
      "2",
      "4",
      "8",
      "40"
    ];
    for(let i = 0; i < prices.length; i++){
      const priceWei = ethers.parseEther(prices[i]);
      const tx = await pond.setFishPrice(i, priceWei);
      await tx.wait();
      console.log(`Fish type ${i} price set to ${prices[i]} CFT.`);
    }
    console.log("All fish prices have been configured.");


    console.log("Injecting initial CFT liquidity into the Pond...");
    const buyTx = await token.buyTokens({ value: ethers.parseEther("100.0") });
    await buyTx.wait();
    const transferTx = await token.transfer(pond.target, ethers.parseEther("100000"));
    await transferTx.wait();
    
    console.log("Pond now has 1000 CFT for buybacks.");


    console.log("\n---Deployment Complete---");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});