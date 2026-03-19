// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract ChauncyFishNFT is ERC721, Ownable {
    using Strings for uint256;
    uint256 private _nextTokenId;
    string private _baseTokenURI = "ipfs://bafybeifjhyvf24sraznr5ijnq44aronpalaufp46dbul3hrz7whe5goi6e/";
    
    // Define who has the right to mint
    address public minter;

    event FishMinted(address indexed player, uint256 tokenId, uint256 fishType);
    
    constructor() ERC721("Chauncy Fish","CFISH") Ownable(msg.sender){}
    
    // define to store the mapping between ID and fish species for each single NFT.
    mapping(uint256 => uint256) idToSpecies;

    mapping(address => mapping(uint256 => uint256)) public fishTypeBalance;

    // Function for setting BaseURI
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        _baseTokenURI = _newBaseURI;
    }

    /**
     * Set the allowed minting addresses.
     * Security guarantee: Only pond contracts can send fish to players. 
     */
    function setMinter(address _minter) external onlyOwner{
        minter = _minter;
    }

    function mintFish(address to, uint256 _type) external returns(uint256) {
        require(msg.sender == minter, "Not authorized to mint");
        uint256 tokenId = _nextTokenId;
        _nextTokenId ++;
        _safeMint(to, tokenId);
        idToSpecies[tokenId] = _type;

        // Records the total number of this type of fish held by the user.
        fishTypeBalance[to][_type] += 1;

        emit FishMinted(to, tokenId, _type);
        return tokenId;
    }

    // override function _baseURI()
    function _baseURI() override view internal returns(string memory){
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns(string memory) {
        // Check ownership
        _requireOwned(tokenId);       
        
        return string(abi.encodePacked(_baseURI(), idToSpecies[tokenId].toString(), ".json"));
    }


    function getFullCollection(address _owner) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](14); // 14 types of fish in total.
        for (uint256 i = 0; i < 14; i++) {
            balances[i] = fishTypeBalance[_owner][i];
        }
        return balances;
    }
    
}