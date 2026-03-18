const {ethers} = require("hardhat");

async function main() {
    const [deployer, player] = await ethers.getSigners();

    const TOKEN_ADDRESS = "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E";
    const NFT_ADDRESS = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690";
    const POND_ADDRESS = "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB";


    const token = await ethers.getContractAt("ChauncyFishingToken", TOKEN_ADDRESS);
    const nft = await ethers.getContractAt("ChauncyFishNFT", NFT_ADDRESS);
    const pond = await ethers.getContractAt("ChauncyPond", POND_ADDRESS);

    console.log("Initiating simulation of the player's fishing process...");

    console.log("1. Player is buying some CFT...");
    const buytx = await token.connect(player).buyTokens({
        value : ethers.parseEther("0.1")
    });
    await buytx.wait();

    let playerBalance = await token.balanceOf(player.address);
    console.log(`Player's Current Balance: ${playerBalance} CFT.`);

    // 2. Players authorize the Pond contract to deduct their CFT.
    console.log("2. Player authorizing...");
    const approve = await token.connect(player).approve(POND_ADDRESS, ethers.parseEther("100"));
    await approve.wait();

    // 3. Players buy baits;
    console.log("Player is buying baits (1 corn seed, 1 minnow lure)") ;
    await pond.connect(player).buyBait(1, 1);
    await pond.connect(player).buyBait(3, 1);

    // check player bag.
    let bag = await pond.userBag(player.address);
    let minnowCt = await pond.getMinnowCount(player.address);
    console.log(`Current status of the player's bag: corns * ${bag.cornCount}, Peas * ${bag.peaCount}, Minnow Lures * ${minnowCt}`);


    // 4.Casting
    console.log("player is Casting...(Using Corn)");
    const castTx = await pond.connect(player).CastLine(1);
    const receipt = await castTx.wait();


    


    // check logs
    const event = receipt.logs.find (log => {
        try {return pond.interface.parseLog(log).name == "Fished";} catch(e) {return false;}
    });

    if (event){
        const decoded = pond.interface.parseLog(event);
        console.log(`Successfully caught a ${decoded.args.dietGroup} fish, speices id: ${decoded.args.typeId}. TokenID: ${decoded.args.tokenId}`);

    }


    // 5.Finally Confirm
    const nftBalance = await nft.balanceOf(player.address); 
    console.log(`Stats: The player now possesses ${nftBalance} fish.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});