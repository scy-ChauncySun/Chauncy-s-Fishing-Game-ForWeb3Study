import { useState, useEffect } from 'react';
import { ethers } from 'ethers';



const TOKEN_ADDRESS = "0xFD471836031dc5108809D173A067e8486B9047A3";

const TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function buyTokens() payable",
  "function approve(address spender, uint256 amount) returns (bool)" // Crucial for buying bait
];



const POND_ADDRESS = "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";
const POND_ABI = [
  "function buyBait(uint8 _type, uint256 _amount) external",
  "function CastLine(uint8 _chosenBait) external",
  "function userBag(address) view returns (uint256 cornCount, uint256 peaCount)",
  "function getMinnowCount(address _userAddr) view returns (uint256)",
  "function getCurrentMinnowState(address _userAddr) external view returns(uint8)",
  "event Fished(address indexed player, uint256 tokenId, uint256 typeId, uint8 usedBait, string dietGroup)"
];


const NFT_ADDRESS = "0xcbEAF3BDe82155F56486Fb5a1072cb8baAf547cc";
const NFT_ABI = [
  "function getFullCollection(address _owner) external view returns (uint256[] memory)"
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


  const [showModal, setShowModal] = useState(false);
  const [caughtFish, setCaughtFish] = useState(null);

  const [fishCollections, setFishCollections] = useState({}); // store the count of each fish type in user's collection
  const [showCollection, setShowCollection] = useState(false); // control the visibility of the collection section

  // --- Wallet Connection ---
  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    }
  };

  const buyCFT = async () => {
    setLoading(true);
    setStatus("Exchanging ETH for CFT...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // Use the Token Contract for buying tokens
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      
      // Send 0.01 ETH to buy tokens (adjust amount as needed)
      const tx = await tokenContract.buyTokens({ value: ethers.parseEther("0.01") });
      setStatus("Transaction sent, waiting for confirmation...");
      await tx.wait();
      
      setStatus("Successfully bought CFT!");
      refreshData(); // Refresh balance
    } catch (err) {
      console.error(err);
      setStatus("Buy CFT Failed: " + (err.reason || "Check ETH balance"));
    }
    setLoading(false);
  };


  // Sync Data (Balance & Inventory) 
  const refreshData = async () => {
    if (!account) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Fetch Token Balance
    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const bal = await token.balanceOf(account);
    setTokenBalance(ethers.formatEther(bal));

    // Fetch Bait Inventory from Pond
    const pond = new ethers.Contract(POND_ADDRESS, POND_ABI, provider);
    const bag = await pond.userBag(account);
    const minnowCount = await pond.getMinnowCount(account);
    const minnowState = await pond.getCurrentMinnowState(account);
    setInventory({
      corn: Number(bag.cornCount),
      pea: Number(bag.peaCount),
      minnow: Number(minnowCount),
      currentLureState: minnowCount > 0 ? `${minnowState} / 3 uses left` : "None"
    });
  };

  useEffect(() => { if (account) refreshData(); }, [account]);

  // Buy Bait Logic (Approve + Buy)
  const handleBuyBait = async (type) => {
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

  const fetchCollections = async () => {
    if (!account) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
    // record the count of each fish type in user's collection for display
    const balances = await nftContract.getFullCollection(account);

    let collections = {};
    balances.forEach((count, index) => {
      collections[index] = Number(count);
    });

    setFishCollections(collections);
  }



  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial' }}>
      <h1>🎣 Fishing Game</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <section style={sectionStyle}>
            <h3>👤 Account & Bank</h3>
            <p>Address: <code>{account.substring(0,6)}...{account.substring(38)}</code></p>
            <p>Balance: <strong>{tokenBalance} CFT</strong></p>
            
          
            <button onClick={buyCFT} disabled={loading} style={{backgroundColor: '#e1f5fe', color: '#01579b'}}>
              Get 10 CFT (Cost 0.01 ETH)
            </button>
            
            <p style={{color: 'blue', fontWeight: 'bold'}}>{status}</p>
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
            <button   
              onClick={() => handleBuyBait(1)} 
              disabled={loading || tokenBalance < 5}
            >
                Buy Corn (5CFT) 
            </button>
            <button 
              onClick={() => handleBuyBait(2)} 
              disabled={loading || tokenBalance < 5}
            >
              Buy Pea (5CFT)
            </button>
            <button 
              onClick={() => handleBuyBait(3)} 
              disabled={loading || tokenBalance < 15}
            >
              Buy Minnow (15CFT)
            </button>
            <div style={{ marginTop: '10px', backgroundColor: '#f9f9f9', padding: '10px' }}>
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
            <select value={selectedBait} onChange={(e) => setSelectedBait(e.target.value)}>
              <option value="1">Use Corn (Herbivorous)</option>
              <option value="2">Use Pea (Herbivorous)</option>
              <option value="3">Use Minnow (Carnivorous)</option>
            </select>
            <button onClick={handleFish} disabled={loading} style={{marginLeft: '10px'}}>CAST LINE</button>
          </section>
        </>
      )}

      {showModal && caughtFish && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ color: '#f1c40f' }}>🌟 NEW FISH CAUGHT! 🌟</h2>
            
           
            <img 
              
              src={new URL(`./assets/fishes/${caughtFish.id}.png`, import.meta.url).href} 
              alt={caughtFish.name}
              style={{ width: '200px', height: '200px', objectFit: 'contain', margin: '20px 0' }}
              // 防崩
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

      {/* --- collection --- */}
      {showCollection && (
        <div style={collectionOverlayStyle}>
          <div style={collectionContainerStyle}>
            
            {/* title and close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🐟 Fish Encyclopedia</h2>
              <button onClick={() => setShowCollection(false)} style={closeBtnStyle}>X</button>
            </div>

            {/* statistics */}
            <p>Collected: {Object.values(fishCollections).filter(c => c > 0).length} / {FISH_NAMES.length}</p>

            {/* fish collection grid */}
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
                        width: '80px',
                        height: '80px',
                        objectFit: 'contain',
                        // fishes not yet collected blur the image.
                        filter: isOwned ? 'none' : 'brightness(0) blur(4px)',
                        opacity: isOwned ? 1 : 0.4
                      }}
                    />
                    <div style={{ fontSize: '11px', marginTop: '8px', color: isOwned ? '#2c3e50' : '#bdc3c7' }}>
                      {isOwned ? name : "???"}
                    </div>
                    {isOwned && (
                      <div style={badgeStyle}>x{count}</div>
                    )}
                  </div>
                );
              })}
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
  zIndex: 1500, // 确保在普通 UI 之上
};

const collectionContainerStyle = {
  backgroundColor: 'white',
  width: '90%',
  maxWidth: '600px',
  borderRadius: '20px',
  padding: '25px',
  maxHeight: '80vh',
  overflowY: 'auto', // 内容多了可以滚动
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
