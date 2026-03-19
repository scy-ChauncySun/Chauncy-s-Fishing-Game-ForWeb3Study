// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol"; //Debug

interface IChauncyFishNFT {
    function mintFish(address to, uint256 _type) external returns(uint256);
}

contract ChauncyPond is Ownable{
    IERC20 public fishingToken;
    IChauncyFishNFT public fishNFT;

    // Define an enumeration for bait types
    enum BaitType {NONE, CORN, PEA, MINNOW}

    struct BaitInventory{
        uint256 cornCount;
        uint256 peaCount;
        uint8[] minnowArray;
    }

    // Mapping to track each user's bait inventory
    mapping (address => BaitInventory) public userBag;

    // Define prices for each bait type 
    uint256 priceNormal = 5 * 10 ** 18; // Normal baits 5 CFT, disappears after one use
    uint256 priceMinnow = 15 * 10 ** 18; // Minnow lures 15 CFT, can be used 3 times.

    event BaitPurchased(address indexed player, BaitType baitType, uint256 amount);
    event Fished(address indexed player, uint256 tokenId, uint256 typeId,BaitType usedBait, string dietGroup);

    constructor(address _tokenAddr, address _nftAddr) Ownable(msg.sender){
        fishingToken = IERC20(_tokenAddr);
        fishNFT = IChauncyFishNFT(_nftAddr);
    }

    

    function buyBait(BaitType _type, uint256 _amount) external{
        require(_amount > 0, "Please enter the quantity you want to purchase.");
        uint256 cost;
        // Calculate the total cost
        if (_type == BaitType.CORN || _type == BaitType.PEA){
            cost = priceNormal * _amount;
        }else if (_type == BaitType.MINNOW){
            cost = priceMinnow * _amount;
        }else{
            revert("Invalid bait type");
        }

        require(fishingToken.transferFrom(msg.sender, address(this), cost), "Patment failed!");
        
        if(_type == BaitType.CORN){
            userBag[msg.sender].cornCount += _amount;
        }else if(_type == BaitType.PEA){
            userBag[msg.sender].peaCount += _amount;
        }else if(_type == BaitType.MINNOW){
            for(uint256 i = 0; i < _amount; i++) {
                // The lifespan of a lure is 3 uses.
                userBag[msg.sender].minnowArray.push(3);
            }
            
        }

        emit BaitPurchased(msg.sender,_type, _amount);

    }



    /**
     * The Fishing Func.
     * @param _chosenBait : The bait type the player chooses to use for fishing.
     */
    function CastLine(BaitType _chosenBait) external {
        //check holdings
        if(_chosenBait == BaitType.CORN){
            require(userBag[msg.sender].cornCount > 0, "You do not have enough corn.");
            userBag[msg.sender].cornCount --;
        }else if(_chosenBait == BaitType.PEA){
            require(userBag[msg.sender].peaCount > 0, "You do not have enough pea.");
            userBag[msg.sender].peaCount --;
        }else if(_chosenBait == BaitType.MINNOW){
            uint256 tempMinnowCount = userBag[msg.sender].minnowArray.length;
            require(tempMinnowCount > 0, "You do not have enough minnow lures.");
            
            userBag[msg.sender].minnowArray[tempMinnowCount - 1] --;
            if(userBag[msg.sender].minnowArray[tempMinnowCount - 1] == 0){
                userBag[msg.sender].minnowArray.pop();
            }
        }else{
            revert("Choose a bait please.");
        }   

        /**
         * generate a random number
         * I have a basic understanding of VRF, but due to the local deployment, I will use pseudo-randomness here.
         */
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao))); 

        /**
         * Fish diet matching logic:
         * Normal baits (corn and pea) can catch herbivorous fish.
         * Minnow lures can catch carnivorous fish.
         * Omnivorous fish may eat both.
         */
        uint256 fishType;
        string memory group;
        uint256 pool;
        if(_chosenBait == BaitType.CORN || _chosenBait == BaitType.PEA){
            // There are 12 species of herbivorous and omnivorous fish.
            pool = rand % 12;
            fishType = pool <= 9 ? pool : (pool + 2); // 0-9 for herbivorous, 12-13 for omnivorous
            group = "Herbivorous/Omnivorous";
        }else if(_chosenBait == BaitType.MINNOW){
            fishType = rand % 4 + 10; 
            group = "Carnivore/Omnivore";
        }   
        
        uint256 tokenId = fishNFT.mintFish(msg.sender, fishType);
        emit Fished(msg.sender, tokenId, fishType, _chosenBait, group);

    }

    function withDrawTokens() external onlyOwner() {
        uint256 _balances = fishingToken.balanceOf(address(this));
        fishingToken.transfer(owner(), _balances);
    }

    // get the count of minnow lures quickly
    function getMinnowCount(address _userAddr) external view returns(uint256) {
        return userBag[_userAddr].minnowArray.length;
    }

    function getCurrentMinnowState(address _userAddr) external view returns(uint8) {
        if(userBag[_userAddr].minnowArray.length == 0){
            return 0; // No minnow
        } else {    
        return userBag[_userAddr].minnowArray[userBag[_userAddr].minnowArray.length - 1];
        }

    }

    
}