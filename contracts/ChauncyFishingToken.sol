// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// import 
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ChauncyFishingToken is ERC20,Ownable {
    // Enable this contract to receive ETH as the Store's start-up capital
    receive() external payable {}

    // Set an exchange rate: 1 ETH = 1000 CFT
    uint256 public constant EXCHANGE_RATE = 1000;

    constructor() ERC20("ChauncyFishingToken","CFT") Ownable(msg.sender){}

    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy CFT.");

        uint256 amountToMint = msg.value * EXCHANGE_RATE;

        _mint(msg.sender, amountToMint);
    }

    /**
     * Withdraw all ETH from this contract address.
     * only the owner can withdraw
     */
    function withDrawETH(uint256 _amount) public onlyOwner {
        uint256 _balance = address(this).balance;
        require(_balance >= _amount, "Insufficient balance in contract.");

        require(_balance - _amount >= 1 ether, "Must keep some reserve for players.");


        (bool success, ) =  owner().call{value: _amount}("");
        require(success, "Transfer failed.");
        
    }


    /**
     * @dev Players exchange their CFT holdings for ETH.
     * @param _cftAmount CFT that the player is willing to offer.
     */
    function sellTokensForETH(uint256 _cftAmount) public {
        require(_cftAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= _cftAmount, "You don't have enough CFT.");

        // Calculate the amount of ETH to return based on the exchange rate
        uint256 ethAmount = _cftAmount / EXCHANGE_RATE;
        // Ensure that the amount of ETH to return is greater than 0 to prevent unnecessary transactions.
        require(ethAmount > 0, "Amount too small: results in 0 ETH");

        // check if the contract has enough ETH to pay the player
        require(address(this).balance >= ethAmount, "Contract doesn't have enough ETH. Please try later.");

        // Execute the exchange process.

        // 1. Burn the player's CFT
        _burn(msg.sender, _cftAmount);

        // 2. Transfer the corresponding amount of ETH back to the player
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed.");

    }   
    
}