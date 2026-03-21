# 🎣 Chauncy Fishing Game (The Backend for a Fishing Game)

A decentralized fishing simulation game powered by Solidity. Players can exchange ETH for custom tokens, purchase various baits, and catch unique NFT fish with randomized species attributes.

## Core Features & Logic (Current Progress)

1. Tokenomics (ERC20): Implements a buyTokens mechanism allowing players to deposit ETH and mint CFT tokens at a fixed rate of 1:1000.

2. Bait System: Supports multiple bait types (Corn, Pea, Minnow Lure), each corresponding to different fish dietary groups (Herbivorous, Carnivorous, Omnivorous).

3. On-chain Randomness: Utilizes a combination of block.prevrandao and keccak256 hashing to determine fishing outcomes and species rarity.

4. NFT Persistence (ERC721): Caught fish are minted as unique NFTs with their species ID permanently mapped on-chain, ensuring metadata consistency via IPFS.


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