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

    console.log("\n---Deployment Complete---");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});