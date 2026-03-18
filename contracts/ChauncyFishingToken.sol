// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// import 
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ChauncyFishingToken is ERC20,Ownable {
    // Set an exchange rate: 1 ETH = 1000 CFT
    uint256 public constant EXCHANGE_RATE = 1000;

    constructor() ERC20("ChauncyFishingToken","CFT") Ownable(msg.sender){}

    function buyTokens() public payable {
        require(msg.value >= 0, "Send ETH to buy CFT.");

        uint256 amountToMint = msg.value * EXCHANGE_RATE;

        _mint(msg.sender, amountToMint);
    }

    /**
     * only the owner can withdraw
     */
    function withDraw() public onlyOwner {
        uint256 _balance = address(this).balance;
        require(_balance > 0, "No ETH to withdraw.");
        (bool success, ) =  owner().call{value: _balance}("");
        require(success, "Transfer failed.");
        
    }
}