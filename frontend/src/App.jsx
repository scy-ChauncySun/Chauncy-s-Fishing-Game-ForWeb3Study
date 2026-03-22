import { useState, useEffect } from 'react';
import { ethers } from 'ethers';


import { TOKEN_ADDRESS, NFT_ADDRESS, POND_ADDRESS } from './contract-config';


// const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function buyTokens() payable",
  "function approve(address spender, uint256 amount) returns (bool)", // Crucial for buying bait
  "function withDrawETH(uint256 _amount) public",
  "function owner() view returns (address)",
  "function sellTokensForEth(uint256 _cftAmount) public",
  "function EXCHANGE_RATE() view returns (uint256)"
];

// const NFT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const NFT_ABI = [
  "function getFullCollection(address _owner) external view returns (uint256[] memory)",
  "function approve(address to, uint256 tokenId) external",
  "function getFishType(uint256 tokenId) external view returns (uint256)",
  "function walletOfOwner(address _owner) public view returns (uint256[] memory)"
];

// const POND_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const POND_ABI = [
  "function buyBait(uint8 _type, uint256 _amount) external",
  "function CastLine(uint8 _chosenBait) external",
  "function userBag(address) view returns (uint256 cornCount, uint256 peaCount)",
  "function getMinnowCount(address _userAddr) view returns (uint256)",
  "function getCurrentMinnowState(address _userAddr) external view returns(uint8)",
  "function fishPrices(uint256) view returns (uint256)", 
  "function sellFish(uint256 _tokenId) external",
  "function setNickname(string memory _newName) external",
  "function getNickname(address _user) public view returns (string memory)",
  "event Fished(address indexed player, uint256 tokenId, uint256 typeId, uint8 usedBait, string dietGroup)"
];

const FISH_NAMES = ["Crucian Carp", "Gibel Carp", "Common Carp", "F1", "Mirror Carp",
        "Orenji Ogon", "Kohaku", "Hi Utsuri", "Mameshibori Goshiki", "Yotsushiro",
        "Perch", "Pike", "Catfish", "Albino Catfish"
];

function App() {
  const [account, setAccount] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [inventory, setInventory] = useState({ corn: 0, pea: 0, minnow: 0, currentLureState: "None" });
  const [selectedBait, setSelectedBait] = useState(1); // Default to CORN (Enum 1)
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  
  const [buyAmount, setBuyAmount] = useState(10); 



  const[showWithdrawHub, setShowWithdrawHub] = useState(false);
  const [isOwner, setIsOwner] = useState(false); // Track if connected account is owner for finance section
  const [contractEth, setContractEth] = useState("0");
  const[withdrawAmount, setWithdrawAmount] = useState(""); // amount to input by the owner to withdraw.
  const[sellCftAmount, setSellCftAmount] = useState(""); // amount to input by the user to sell CFT for ETH.


  const [showModal, setShowModal] = useState(false);
  const [caughtFish, setCaughtFish] = useState(null);

  const [fishCollections, setFishCollections] = useState({}); // store the count of each fish type in user's collection
  const [showCollection, setShowCollection] = useState(false); // control the visibility of the collection section

  const [nickname, setNicknameState] = useState("Fisherman");
  const [newNicknameInput, setNewNicknameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(false); // control nickname editing modal visibility


  // --- Wallet Connection ---
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        setAccount(accounts[0]);
        
        
        refreshData();
      } catch (err) {
        console.error("User rejected connection");
      }
    }
  };

  const buyCFT = async (amount) => {
    if (!amount || amount <= 0) return;
    const isSynced = await validateAccount();
    if (!isSynced) return;
    setLoading(true);
    setStatus(`Exchanging ETH for ${amount} CFT...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // Use the Token Contract for buying tokens
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      
      const ethValue = (amount / 1000).toString(); 
      // Send 0.01 ETH to buy tokens (adjust amount as needed)
      const tx = await tokenContract.buyTokens({
         value: ethers.parseEther(ethValue) 
      });
      setStatus("Transaction sent, waiting for confirmation...");
      await tx.wait();
      
      setStatus(`Successfully bought ${amount} CFT!`);
      refreshData(); // Refresh balance
    } catch (err) {
      console.error(err);
      setStatus("Buy CFT Failed: " + (err.reason || "Check ETH balance"));
    }
    setLoading(false);
  };


  // Sync Data (Balance & Inventory) 
  const refreshData = async (targetAccount = null) => {
    const activeAccount = targetAccount || account; // Allow passing a specific account for refresh after wallet changes
    if (!activeAccount) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Fetch Token Balance
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
      const bal = await token.balanceOf(activeAccount); // 使用 activeAccount
      setTokenBalance(ethers.formatEther(bal));

      // Fetch Bait Inventory from Pond
      const pond = new ethers.Contract(POND_ADDRESS, POND_ABI, provider);
      const bag = await pond.userBag(activeAccount); // 使用 activeAccount
      const minnowCount = await pond.getMinnowCount(activeAccount); // 使用 activeAccount
      const minnowState = await pond.getCurrentMinnowState(activeAccount); // 使用 activeAccount
      

      const name = await pond.getNickname(activeAccount);
      setNicknameState(name);
      setInventory({
        corn: Number(bag.cornCount),
        pea: Number(bag.peaCount),
        minnow: Number(minnowCount),
        currentLureState: minnowCount > 0 ? `${minnowState} / 3 uses left` : "None"
      });
    } catch (err) {
      console.error("Refresh Data Failed:", err);
    }
  };

  useEffect(() => { 
    if (account) {
      refreshData(account);
      fetchFinanceData();
    }
  }, [account]);

  // Buy Bait Logic (Approve + Buy)
  const handleBuyBait = async (type) => {
    const isSynced = await validateAccount();
    if (!isSynced) return;
    setLoading(true);
    setStatus("Processing purchase...");
     
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const pond = new ethers.Contract(POND_ADDRESS, POND_ABI, signer);

      // Define price based on your contract (Enum: 1=Corn, 2=Pea, 3=Minnow)
      const pricePerUnit = type === 3 ? ethers.parseEther("15") : ethers.parseEther("5");
      
      // Step A: Approve Pond to spend your CFT
      setStatus("Step 1/2: Approving CFT...");
      const appTx = await token.approve(POND_ADDRESS, pricePerUnit);
      await appTx.wait();

      // Step B: Call buyBait
      setStatus("Step 2/2: Buying Bait...");
      const buyTx = await pond.buyBait(type, 1); // Buying 1 unit
      await buyTx.wait();

      setStatus("Purchase Successful!");
      refreshData();
    } catch (err) {
      console.error("Full Error Object:", err);
      const reason = err.reason || err.message || "Unknown Error";
      setStatus("Transaction Failed: " + reason);
    }
    setLoading(false);
  };

  //  Fishing Logic
  const handleFish = async () => {
    const isSynced = await validateAccount();
    if (!isSynced) return;
    setLoading(true);
    setStatus("Casting line...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pond = new ethers.Contract(POND_ADDRESS, POND_ABI, signer);

      // Execute CastLine with the selected bait from dropdown
      const tx = await pond.CastLine(selectedBait, {
        gasLimit: 300000 // Set large gas limit for the fishing action
      });
      const receipt = await tx.wait();

      // Parse logs to find the Fish
      const event = receipt.logs
        .map(log => { try { return pond.interface.parseLog(log); } catch(e) { return null; }})
        .find(e => e && e.name === "Fished");

      if (event) {
        const typeId = Number(event.args.typeId);
        const fishName = FISH_NAMES[typeId]; 
        
        setCaughtFish({
            id: typeId,
            name: fishName,
            tokenId: event.args.tokenId.toString()
        });
        
        setShowModal(true); 
      }
      refreshData();
    } catch (err) {
      console.error(err);
      setStatus("Fishing Failed - Check your bait inventory");
    }
    setLoading(false);
  };


  const handleSellFish = async (tokenId) => {
    const isSynced = await validateAccount();
    if (!isSynced) return;
    setLoading(true);
    setStatus(`Preparing to sell Fish #${tokenId}...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
      const pond = new ethers.Contract(POND_ADDRESS, POND_ABI, signer);

      
      setStatus("Step 1/2: Authorizing Pond to take NFT...");
      const appTx = await nft.approve(POND_ADDRESS, tokenId);
      await appTx.wait();

      
      setStatus("Step 2/2: Selling to Fish Market...");
      const sellTx = await pond.sellFish(tokenId);
      await sellTx.wait();

      setStatus("Fish sold successfully! CFT received.");
      
      
      await refreshData();       
      await fetchCollections();  
    } catch (err) {
      console.error(err);
      setStatus("Sell Failed: " + (err.reason || "Check allowance or ownership"));
    }
    setLoading(false);
  };


  const fetchCollections = async () => {
    const isSynced = await validateAccount();
    if (!isSynced) return;
    if (!account) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
      
     
      const balances = await nftContract.getFullCollection(account);
      
      
      let newCollections = {};
      balances.forEach((count, index) => {
        newCollections[index] = Number(count);
      });

      console.log("Updated Collections:", newCollections); // 调试用
      setFishCollections(newCollections); 
    } catch (err) {
      console.error("Fetch collection failed:", err);
    }
  };


  // check this player is owner or not, if owner then show the withdraw hub and finance data
  const fetchFinanceData = async () =>{
    const isSynced = await validateAccount();
    if (!isSynced) return;
    if(!account)  return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    
    const ownerAddr = await tokenContract.owner();
    setIsOwner(ownerAddr.toLowerCase() === account.toLowerCase());


    // get contract's ETH balance
    const ethBal = await provider.getBalance(TOKEN_ADDRESS);
    setContractEth(ethers.formatEther(ethBal));
  }

  
  const handleSellTokens = async() => {
    const isSynced = await validateAccount();
    if (!isSynced) return;
    if(!sellCftAmount || isNaN(sellCftAmount))  return;
    setLoading(true);
    setStatus("Exchanging CFT for ETH...");
    try{
      const provider =  new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      const tx = await tokenContract.sellTokensForEth(ethers.parseEther(sellCftAmount));
      await tx.wait();
      setStatus("Exchange successful!");
      refreshData();
      fetchFinanceData();
    }catch (err){
      setStatus("Exchange failed: " + (err.reason || "Check balance or reserve"));
    }
    setLoading(false);
  }
  


  const handleAdminWithdraw = async() => {
    const isSynced = await validateAccount();
    if (!isSynced) return;
    if(!withdrawAmount || isNaN(withdrawAmount)) return;
    setLoading(true);
    setStatus("Withdrawing contract profits...");
    try{
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      
      const tx = await tokenContract.withDrawETH(ethers.parseEther(withdrawAmount));
      await tx.wait();
      setStatus("Withdrawal successful!");
      fetchFinanceData();
    }catch(err){
      setStatus("Withdrawal failed: " + (err.reason || "Check reserve limit"));
    }
    setLoading(false);
  }

  // This function can be called before any critical transaction to ensure the front-end account state is in sync with MetaMask. If a user has switched accounts or if there is any discrepancy, it will update the state and prompt the user to try again, preventing failed transactions due to account mismatch.
  const validateAccount = async () => {
    if (!window.ethereum) return false;
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const currentActiveAccount = accounts[0]?.toLowerCase();
    
    if (currentActiveAccount !== account?.toLowerCase()) {
      // If there is a discrepancy, force an update to the front-end state and block the transaction.
      setAccount(accounts[0]);

      await refreshData(accounts[0]);
      setStatus("⚠️ Account sync error! Please try clicking the button again.");
      return false;
    }
    return true;
  };


  const handleUpdateNickname = async () => {
    if (!newNicknameInput) return;
    const isSynced = await validateAccount();
    if (!isSynced) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const pond = new ethers.Contract(POND_ADDRESS, POND_ABI, signer);

      const tx = await pond.setNickname(newNicknameInput,{
        gasLimit: 100000 // Set a reasonable gas limit for nickname update
      });
      await tx.wait();
      
      setStatus("Nickname updated!");
      setShowNameModal(false);
      refreshData();
    } catch (err) {
      setStatus("Update failed: " + (err.reason || "Check admin restrictions"));
    }
    setLoading(false);
  };



  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial' }}>
      {account && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '30px', 
          padding: '20px', 
          backgroundColor: '#f0f7ff', 
          borderRadius: '15px', 
          border: '2px dashed #3498db',
          position: 'relative' 
        }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>
            👋 Welcome, <span style={{ color: '#e67e22' }}>{nickname}</span> !
          </h2>
          
          {/* Nickname button moved under welcome message and only shows for non-admins */}
          {!isOwner && (
            <button 
              onClick={() => setShowNameModal(true)}
              style={{ 
                marginTop: '10px',
                fontSize: '12px', 
                padding: '5px 15px', 
                backgroundColor: '#9b59b6', 
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit Nickname
            </button>
          )}
        </div>
      )}

      <h1 style={{ textAlign: 'center' }}>🎣 Chauncy's Fishing Game</h1>
      
      {!account ? (
        <div style={{ textAlign: 'center' }}>
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : (
        <>
          {/* Centered Account and Bank section */}
          <section style={{ ...sectionStyle, textAlign: 'center' }}>
            <h3>👤 Account & Bank</h3>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ margin: '5px 0' }}>Address: <code>{account.substring(0,6)}...{account.substring(38)}</code></p>
              <p style={{ margin: '5px 0', fontSize: '18px' }}>Balance: <strong>{tokenBalance} CFT</strong></p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <select 
                value={buyAmount} 
                onChange={(e) => setBuyAmount(Number(e.target.value))}
                style={{ padding: '8px', borderRadius: '5px' }}
              >
                <option value="10">10 CFT (0.01 ETH)</option>
                <option value="50">50 CFT (0.05 ETH)</option>
                <option value="100">100 CFT (0.1 ETH)</option>
                <option value="500">500 CFT (0.5 ETH)</option>
              </select>

              <button 
                onClick={() => buyCFT(buyAmount)} 
                disabled={loading} 
                style={{
                  backgroundColor: '#e1f5fe', 
                  color: '#01579b', 
                  padding: '8px 15px',
                  fontWeight: 'bold',
                  border: '1px solid #b3e5fc',
                  borderRadius: '5px'
                }}
              >
                {loading ? "Processing..." : `Buy CFT`}
              </button>

              <button 
                onClick={() => { fetchFinanceData(); setShowWithdrawHub(true); }} 
                style={{ backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '5px', padding: '8px 15px' }}
              >
                💰 Withdraw Hub
              </button>
            </div>
            
            {status && <p style={{ color: 'blue', fontWeight: 'bold', marginTop: '10px' }}>{status}</p>}
          </section>

          <section style={sectionStyle}>
            <h3>🎒 My Storage</h3>
            <button 
              onClick={() => {
                fetchCollections(); 
                setShowCollection(true); 
              }}
              style={{ backgroundColor: '#2ecc71', color: 'white' }}
            >
              View Fish Collection 
            </button>
          </section>

          <section style={sectionStyle}>
            <h3>🛒 Bait Shop (Cost: 5-15 CFT)</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button 
                onClick={() => handleBuyBait(1)} 
                disabled={loading || tokenBalance < 5}
                style={{ flex: 1, padding: '10px 5px', whiteSpace: 'nowrap' }}
              >
                🌽 Corn * 1 (5 CFT)
              </button>
              <button 
                onClick={() => handleBuyBait(2)} 
                disabled={loading || tokenBalance < 5}
                style={{ flex: 1, padding: '10px 5px', whiteSpace: 'nowrap' }}
              >
                🟢 Pea * 1 (5 CFT)
              </button>
              <button 
                onClick={() => handleBuyBait(3)} 
                disabled={loading || tokenBalance < 15}
                style={{ flex: 1, padding: '10px 5px', whiteSpace: 'nowrap' }}
              >
                🐟 Minnow Lure * 1 (15 CFT)
              </button>
            </div>
            <div style={{ marginTop: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
              <p>🌽 Corn: {inventory.corn}</p>
              <p>🟢 Pea: {inventory.pea}</p>
              <p>🐟 Minnow Lures: {inventory.minnow > 0 ? inventory.minnow : "None"}</p>
              {inventory.minnow > 0 && (
                <p style={{ color: '#d35400', fontWeight: 'bold' }}>
                  ⚙️ Current Minnow Durability: {inventory.currentLureState}
                </p>
              )}
            </div>
          </section>

          <section style={sectionStyle}>
            <h3>🌊 Fishing Pond</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select style={{ flex: 1 }} value={selectedBait} onChange={(e) => setSelectedBait(e.target.value)}>
                <option value="1">Use Corn (Herbivorous)</option>
                <option value="2">Use Pea (Herbivorous)</option>
                <option value="3">Use Minnow (Carnivorous)</option>
              </select>
              <button onClick={handleFish} disabled={loading} style={{ padding: '0 20px' }}>CAST LINE</button>
            </div>
          </section>
        </>
      )}

      {/* Caught Fish Modal */}
      {showModal && caughtFish && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ color: '#f1c40f' }}>🌟 NEW FISH CAUGHT! 🌟</h2>
            <img 
              src={new URL(`./assets/fishes/${caughtFish.id}.png`, import.meta.url).href} 
              alt={caughtFish.name}
              style={{ width: '200px', height: '200px', objectFit: 'contain', margin: '20px 0' }}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=Fish+Image'; }}
            />
            <h3>{caughtFish.name}</h3>
            <p style={{ color: '#7f8c8d' }}>Token ID: #{caughtFish.tokenId}</p>
            <button 
              onClick={() => setShowModal(false)}
              style={{ backgroundColor: '#3498db', color: 'white', padding: '10px 30px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Collect & Continue
            </button>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {showCollection && (
        <div style={collectionOverlayStyle}>
          <div style={collectionContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🐟 Fish Encyclopedia & Market</h2>
              <button onClick={() => setShowCollection(false)} style={closeBtnStyle}>X</button>
            </div>
            <div style={gridStyle}>
              {FISH_NAMES.map((name, index) => {
                const count = fishCollections[index] || 0;
                const isOwned = count > 0;
                return (
                  <div key={index} style={fishCardStyle}>
                    <img 
                      src={new URL(`./assets/fishes/${index}.png`, import.meta.url).href}
                      alt={name}
                      style={{
                        width: '80px', height: '80px', objectFit: 'contain',
                        filter: isOwned ? 'none' : 'brightness(0) blur(4px)',
                        opacity: isOwned ? 1 : 0.4
                      }}
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=Fish'; }}
                    />
                    <div style={{ fontSize: '11px', marginTop: '8px', color: isOwned ? '#2c3e50' : '#bdc3c7', fontWeight: 'bold' }}>
                      {isOwned ? name : "???"}
                    </div>
                    {isOwned && (
                      <>
                        <div style={badgeStyle}>x{count}</div>
                        <button 
                          onClick={async () => {
                            const provider = new ethers.BrowserProvider(window.ethereum);
                            const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
                            const allIds = await nftContract.walletOfOwner(account);
                            let targetId = null;
                            for(let id of allIds) {
                              const type = await nftContract.getFishType(id);
                              if(Number(type) === index) { targetId = id; break; }
                            }
                            if(targetId !== null) { handleSellFish(targetId); }
                            else { alert("Could not find a valid ID for this fish."); }
                          }}
                          style={sellBtnStyle}
                          disabled={loading}
                        >
                          {loading ? "..." : "Sell (1)"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Hub Modal */}
      {showWithdrawHub && (
        <div style={collectionOverlayStyle}>
          <div style={{...collectionContainerStyle, maxWidth: '500px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>💰 Finance Hub</h2>
              <button onClick={() => setShowWithdrawHub(false)} style={closeBtnStyle}>X</button>
            </div>
            <p style={{color: 'blue', fontWeight: 'bold'}}>{status}</p>
            <section style={{...sectionStyle, backgroundColor: '#f8f9fa'}}>
              <h4>🎮 Redeem Earnings (CFT to ETH)</h4>
              <p>Your Balance: <strong>{tokenBalance} CFT</strong></p>
              <div style={{display: 'flex', gap: '10px'}}>
                <input 
                  type="number" placeholder="Enter CFT amount" value={sellCftAmount}
                  onChange={(e) => setSellCftAmount(e.target.value)}
                  style={{flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                />
                <button onClick={handleSellTokens} disabled={loading || !sellCftAmount} 
                  style={{backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', padding: '0 15px', cursor: 'pointer'}}>
                  Exchange
                </button>
              </div>
              <small style={{color: '#7f8c8d'}}>Rate: 1000 CFT = 1 ETH</small>
            </section>

            {isOwner && (
              <section style={{...sectionStyle, borderColor: '#e74c3c', backgroundColor: '#fff5f5', marginTop: '20px'}}>
                <h4 style={{color: '#c0392b'}}>🛡️ Admin Treasury</h4>
                <p>Contract Vault: <strong>{contractEth} ETH</strong></p>
                <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                  <input 
                    type="number" placeholder="ETH amount" value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={{flex: 1, padding: '8px', border: '1px solid #c0392b', borderRadius: '4px'}}
                  />
                  <button onClick={handleAdminWithdraw} disabled={loading || !withdrawAmount} 
                    style={{backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', padding: '0 15px', cursor: 'pointer'}}>
                    Withdraw
                  </button>
                </div>
              </section>
            )}
            <div style={{textAlign: 'center', marginTop: '20px'}}>
              <button onClick={() => setShowWithdrawHub(false)} style={{padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc'}}>Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Nickname Modal */}
      {showNameModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Update Your Identity</h3>
            <input 
              type="text" placeholder="New Nickname..." value={newNicknameInput}
              onChange={(e) => setNewNicknameInput(e.target.value)}
              style={{ width: '80%', padding: '10px', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={handleUpdateNickname} disabled={loading} style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px' }}>Save</button>
              <button onClick={() => setShowNameModal(false)} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




const sectionStyle = { border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '8px' };

const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s' 
};

const modalContentStyle = {
  backgroundColor: 'white',
  padding: '40px',
  borderRadius: '20px',
  textAlign: 'center',
  boxShadow: '0 0 20px rgba(241, 196, 15, 0.5)',
  maxWidth: '400px',
  width: '90%'
};

const collectionOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1500, 
};

const collectionContainerStyle = {
  backgroundColor: 'white',
  width: '90%',
  maxWidth: '600px',
  borderRadius: '20px',
  padding: '25px',
  maxHeight: '80vh',
  overflowY: 'auto', 
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '15px',
};

const fishCardStyle = {
  border: '1px solid #f0f0f0',
  borderRadius: '12px',
  padding: '10px',
  textAlign: 'center',
  position: 'relative',
  backgroundColor: '#fcfcfc',
};

const badgeStyle = {
  position: 'absolute',
  top: '-5px',
  right: '-5px',
  backgroundColor: '#e74c3c',
  color: 'white',
  borderRadius: '10px',
  padding: '2px 8px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const closeBtnStyle = {
  padding: '5px 12px',
  backgroundColor: '#95a5a6',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer'
};




export default App;
