# 🎣 Chauncy's Fishing Game 

A decentralized fishing simulation game developed as a hands-on project to master Web3 development concepts. Players can buy bait using custom tokens, catch unique fish NFTs, and manage their earnings through a financial hub.

## 🚀 Learning Objectives
This project was created to explore and implement:
* **Smart Contract Development:** Writing, testing, and deploying secure contracts.
* **Tokenomics:** Implementing a dual-token system (ERC-20 for currency and ERC-721 for collectibles).
* **Frontend Integration:** Connecting a React UI to the blockchain using Ethers.js.
* **Asset Management:** Handling NFT metadata and media via IPFS (Pinata).

## 🛠️ Tech Stack
* **Blockchain Framework:** [Hardhat](https://hardhat.org/) (Development, testing, and local node deployment)
* **Smart Contracts:** Solidity (ERC-20 & ERC-721)
* **Frontend:** React.js
* **Web3 Library:** Ethers.js (v6)
* **Storage:** Pinata / IPFS (NFT Images & Metadata)
* **Wallet:** MetaMask

## ⚠️ Current Status: Local Deployment
Please note that this project is currently configured for **Localhost only**. 
* The contracts are deployed on a local Hardhat node.
* It is not currently live on any public Testnets.
* All assets and transactions shown in the demonstrations are running on a local development environment.

## Core Features & Logic (Current Progress)

1. Tokenomics (ERC20): Implements a buyTokens mechanism allowing players to deposit ETH and mint CFT tokens at a fixed rate of 1:1000.

2. Bait System: Supports multiple bait types (Corn, Pea, Minnow Lure), each corresponding to different fish dietary groups (Herbivorous, Carnivorous, Omnivorous).

3. On-chain Randomness: Utilizes a combination of block.prevrandao and keccak256 hashing to determine fishing outcomes and species rarity.

4. NFT Persistence (ERC721): Caught fish are minted as unique NFTs with their species ID permanently mapped on-chain, ensuring metadata consistency via IPFS.


## 🎮 Detailed Introduction

**Chauncy's Fishing Game** is a decentralized mini-game developed as an introductory project for learning Web3 development. The ecosystem features a custom utility token, **ChauncyFishingToken (CFT)**, and a unique collection of Non-Fungible Tokens, **Chauncy Fish (CFISH)**.

By connecting their Web3 wallets, users can engage in a complete on-chain circular economy:

### 🪙 Token Economy & Assets
* **ChauncyFishingToken (CFT)**: The primary in-game currency used for all transactions.
* **Chauncy Fish (CFISH)**: ERC-721 NFTs representing the fish caught by players, featuring unique metadata and scarcity.

### 🎣 Core Gameplay Features

1.  **Token Exchange (Swap)**: Seamlessly exchange **ETH** for **CFT** to kickstart your fishing journey.
2.  **Bait Shop**: Spend your **CFT** to purchase different types of bait. Currently, three tiers are available:
    * 🌽 **Corn** 
    * 🫛 **Pea** 
    * 🐟 **Minnow Lure** 
3.  **On-chain Fishing**: Cast your line using your bait to catch a **CFISH**. The result is determined by on-chain logic, yielding fish with randomized rarities ranging from **1-Star to 5-Stars**.
4.  **NFT Marketplace (Buyback)**: 
    * **Collect**: You may choose to hold your CFISH.
    * **Sell**: Liquidate your CFISH back to the game shop in exchange for **CFT**. The payout scales with the star-rating (rarity) of the fish.
5.  **Withdrawal**: At any time, users can choose to convert their **CFT** back into **ETH**, which is then transferred directly to their personal wallet.

### ▶️ Process Diagram

```mermaid
graph TD
    %% Stage 1: Initialization
    Start([Project Launch]) --> Deploy[Contract Deployment]
    Deploy --> Inject[Admin injects ETH into Token Contract <br/>as Liquidity Reserve]
    Inject --> Setup[Pond Configuration: <br/>Set Fish Prices and Minting Rights]
    %% Stage 2: Economy
    Setup --> Economics{Economy Cycle}
    
    Economics --> BuyCFT[Buy CFT: <br/>Exchange ETH for CFT Tokens]
    BuyCFT --> BuyBait[Purchase Bait: <br/>Spend CFT for Corn/Pea/Minnow]
    
    %% Stage 3: Core Gameplay
    BuyBait --> Fishing[Cast Line: <br/>Consume Bait / Random Probability]
    Fishing --> MintNFT[Auto-Mint Fish NFT <br/>to Player Wallet]
    %% Stage 4: Earnings & Withdrawal
    MintNFT --> Market[Fish Market: <br/>Sell NFT for CFT Profit]
    
    Market --> Exit{Withdrawal}
    Exit --> UserSell[User Redemption: <br/>Burn CFT for ETH]
    Exit --> AdminWithdraw[Admin Withdrawal: <br/>Extract Surplus ETH/CFT]
    %% Styles
    style Start fill:#f9f,stroke:#333
    style Deploy fill:#dae8fc,stroke:#6c8ebf
    style Economics fill:#fff2cc,stroke:#d6b653
    style Fishing fill:#d5e8d4,stroke:#82b366
    style AdminWithdraw fill:#f8cecc,stroke:#b85450


> **⚠️ Disclaimer**: 
> This project is developed strictly for **educational and personal learning purposes** only. It has **no commercial intent**. 
> 
> Currently, the dApp is **not deployed** on any public testnets or mainnets. It is designed to run and be tested exclusively in a **local development environment** (e.g., Hardhat node). 
> 
> This project demonstrates the technical integration of ERC-20 and ERC-721 standards, showcasing how smart contracts manage game logic, random probability, and financial liquidity in a controlled, local setting.



## Development Logs

### 2026-03-18
- **[Architecture] NFT Species Binding**: Introduced idToSpecies mapping in ChauncyFishNFT.sol to permanently link a tokenId to its biological species (0-13) on-chain.

- **[Fix] Interface Synchronization**: Resolved a critical TypeError (Wrong argument count) by synchronizing the mintFish function signature across the Pond interface and the NFT contract.


- **[Optimization] Dynamic Metadata**: Refactored tokenURI to use the on-chain idToSpecies value, enabling the dynamic generation of IPFS metadata links (e.g., ipfs://.../{species}.json).


- **[Git] Version Control**: Initialized Git repository and configured a comprehensive .gitignore to protect sensitive .env files and exclude heavy node_modules and build artifacts.


### 2026-03-19
- **[Develop] Frontend UI development**: Designed and implemented the front-end components of a portion of the program.

- **Asset Integration**: Successfully imported and mapped all 14 fish species' sprites from assets/fishes.


- **Visual Effects**:  Added a "silhouette" effect (using CSS filters) for uncollected fish to enhance the exploration and collection experience.


- **Smart Contract & Frontend Integration**:  * Implemented getFullCollection in the NFT contract for efficient batch querying of player holdings.

Fixed a critical "revert" bug during the CastLine process by optimizing Gas limits and internal function calls.

Resolved an issue where fish types were repetitive due to local block timestamp limitations by introducing a nonce to the PRNG logic.


### 2026-03-20
- **[Develop] Frontend UI development**: Successfully integrated with the backend for the fish-selling feature.

- **backend development**: New features have been added: 
    1. Catch probabilities and sale prices have been established for fish species of varying rarity levels. 
    2. The contract owner now injects initial capital into the contract during deployment. 
    3. Users can now sell their FishNFTs in exchange for CFT, and subsequently withdraw their CFT holdings as ETH. 
    4. The codebase now supports the contract owner withdrawing ETH from the contract account.


### 2026-03-21
- **[Develop] Frontend UI development**: 
    1. Implemented the functionality allowing the contract owner to withdraw ETH from the contract address.
    2. Completed the frontend functionality allowing users to withdraw all of their CFT.

    The development tasks are basically completed; final debugging will be conducted tomorrow.

### 2026-03-22
- **[Develop] Frontend UI development**: Development tasks are basically completed; debug and improve UI display and optimize functionality.