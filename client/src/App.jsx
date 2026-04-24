import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, STOCK_OPTIONS, DEFAULT_USER_ID } from "./config/constants";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { messagingPromise } from "./firebase";
import { getToken } from "firebase/messaging";
import { onAuthStateChanged, signOut } from "firebase/auth";

function App() {
  const [userStatus, setUserStatus] = useState("idle"); 
// "idle" | "checking" | "exists" | "new" | "error"
  const [threshold, setThreshold] = useState(2);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedStock, setSelectedStock] = useState(STOCK_OPTIONS[0]);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login"); 
  const [activeTab, setActiveTab] = useState("dashboard");
  const [marketSummary, setMarketSummary] = useState(null);

  const handleLogout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
  };


  const getDeviceToken = async () => {
    try {
      const messaging = await messagingPromise;
      if (!messaging) {
        console.log("Messaging not supported");
        return null;
      }
  
      const permission = await Notification.requestPermission();
      console.log("👉 Step 3: permission:", permission);

  
      if (permission !== "granted") {
        console.log("Notification permission denied");
        return null;
      }
      
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      console.log("✅ Step 4: FCM Token:", token);
      return token;

    } catch (err) {
      console.error("Token error:", err);
      return null;
    }
  };


  const login = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      setFirebaseUser(firebaseUser);

      // 🔗 Link with backend
      await axios.post(`${API_URL}/user/link-firebase`, {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        existingUserId: firebaseUser.uid // your current input field
      });

      const token = await getDeviceToken();

      if (token) {
        await axios.post(`${API_URL}/user/save-token`, {
          firebaseUid: firebaseUser.uid,
          token
        });
      }
      console.log("Logged in:", userCredential.user);
    } catch (err) {
      console.error("Login error:", err.message);
    }
  };



  const signup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      setFirebaseUser(firebaseUser);

      // 🔗 Link with backend
      await axios.post(`${API_URL}/user/link-firebase`, {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        existingUserId: firebaseUser.uid // your current input field
      });
      const token = await getDeviceToken();
      console.log("Token is: ", token)

      if (token) {
        await axios.post(`${API_URL}/user/save-token`, {
          firebaseUid: firebaseUser.uid,
          token
        });
      }
      console.log("Signed up:", userCredential.user);
    } catch (err) {
      console.error("Signup error:", err.message);
    }
  };



  // 🔹 Load user data
  useEffect(() => {
    if (!firebaseUser) return;
  
    async function fetchUser() {
      try {
        setUserStatus("checking");
  
        const res = await axios.get(`${API_URL}/user/${firebaseUser.uid}`);
  
        if (res.data && res.data.watchlist !== undefined) {
          setWatchlist(res.data.watchlist || []);
          setThreshold(res.data.threshold ?? 2);
          setUserStatus("exists");
        } else {
          setWatchlist([]);
          setThreshold(2);
          setUserStatus("new");
        }
      } catch (err) {
        console.error("Error fetching user:", err.message);
        setUserStatus("error");
      }
    }
  
    fetchUser();
  }, [firebaseUser]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
      } else {
        setFirebaseUser(null);
      }
    });
  
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
  
    const fetchSummary = async () => {
      try {
        const res = await axios.get(`${API_URL}/market/summary`);
        setMarketSummary(res.data);
      } catch (err) {
        console.error("Summary fetch failed", err);
      }
    };
  
    fetchSummary();
  }, [firebaseUser]);


  const addStock = () => {
    if (!selectedStock) return;
  
    if (!watchlist.includes(selectedStock)) {
      const newWatchlist = [...watchlist, selectedStock];
      setWatchlist(newWatchlist);
  
      // 👇 compute next available stock immediately
      const remainingStocks = STOCK_OPTIONS.filter(
        stock => !newWatchlist.includes(stock)
      );
  
      if (remainingStocks.length > 0) {
        setSelectedStock(remainingStocks[0]);
      } else {
        setSelectedStock(""); // nothing left
      }
    }
  };

  const removeStock = (stock) => {
    const newWatchlist = watchlist.filter(s => s !== stock);
    setWatchlist(newWatchlist);
  
    const remainingStocks = STOCK_OPTIONS.filter(
      s => !newWatchlist.includes(s)
    );
  
    if (remainingStocks.length > 0) {
      setSelectedStock(remainingStocks[0]);
    }
  };

  // 🔹 Save to backend
  const [saving, setSaving] = useState(false);

  const saveConfig = async () => {
    try {
      setSaving(true);
  
      await axios.post(`${API_URL}/user/update`, {
        userId: firebaseUser.uid,
        watchlist,
        threshold: Number(threshold)
      });
  
    } catch (err) {
      console.error("Save failed:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const availableStocks = STOCK_OPTIONS.filter(
    stock => !watchlist.includes(stock)
  );

  

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-indigo-600 text-center mb-1">
            📈 Stock Alert
        </h1>
        <p className="text-sm text-gray-500 text-center mb-4">
            Get notified when your stocks move
        </p>
        {/* 🔐 Firebase Login Section */}
        <div className="mb-4">
          {!firebaseUser ? (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg p-2 mb-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg p-2 mb-2"
              />
              <div className="flex mb-3 border rounded-lg overflow-hidden bg-gray-100">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 py-2 text-sm font-medium ${
                    authMode === "login"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode("signup")}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    authMode === "signup"
                      ? "bg-indigo-500 text-white shadow"
                      : "bg-white text-gray-500"
                  }`}
                >
                  Signup
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2 text-center">
                  {authMode === "login"
                    ? "Welcome back 👋"
                    : "Create a new account to get started"}
              </p>
              <button
                  onClick={authMode === "login" ? login : signup}
                  className="w-full bg-indigo-500 text-white px-4 py-2 rounded-lg"
              >
                  {authMode === "login" ? "Login" : "Sign Up"}
              </button>
            </>

          ) : (
            <div className="flex justify-between items-center text-sm mb-2">
              <div className="text-green-600">
                👤 {firebaseUser.email}
                {userStatus === "exists" && " • User found ✅"}
                {userStatus === "checking" && " • Checking..."}
                {userStatus === "error" && " • Error ❌"}
              </div>

              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1 border border-red-400 text-red-500 rounded-full hover:bg-red-50"
                >
                Logout
              </button>
            </div>
          )}
        </div>
  
        {/* 🔒 ONLY SHOW APP AFTER LOGIN */}
        {firebaseUser && (
            <>
              <div className="flex mb-4 border rounded-lg overflow-hidden bg-gray-100">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex-1 py-2 text-sm font-medium ${
                    activeTab === "dashboard"
                      ? "bg-indigo-500 text-white"
                      : "text-gray-600"
                  }`}
                >
                  📈 Dashboard
                </button>

                <button
                  onClick={() => setActiveTab("summary")}
                  className={`flex-1 py-2 text-sm font-medium ${
                    activeTab === "summary"
                      ? "bg-indigo-500 text-white"
                      : "text-gray-600"
                  }`}
                >
                  📊 Summary
                </button>
              </div>
              
              {activeTab === "dashboard" && (
                <>

                      <div className="mb-4">
                        <label className="block text-sm font-medium">Threshold (%)</label>
                        <input
                          type="number"
                          value={threshold}
                          onChange={(e) => setThreshold(e.target.value)}
                          className="mt-1 w-full border rounded-lg p-2"
                        />
                      </div>

                      <div className="flex gap-2 mb-4">
                        <select
                          value={selectedStock || ""}
                          onChange={(e) => setSelectedStock(e.target.value)}
                          className="flex-1 border rounded-lg p-2"
                          disabled={availableStocks.length === 0}
                        >
                          {availableStocks.length > 0 ? (
                            availableStocks.map((stock) => (
                              <option key={stock} value={stock}>
                                {stock.replace(".NS", "")}
                              </option>
                            ))
                          ) : (
                            <option value="">No stocks left</option>
                          )}
                        </select>

                        <button
                          onClick={addStock}
                          disabled={!selectedStock || availableStocks.length === 0}
                          className="bg-indigo-500 text-white px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                      <h3 className="font-semibold mb-3 text-gray-700">Your Watchlist</h3>
            
                      {watchlist.length === 0 && (
                        <p className="text-gray-400 text-sm">No stocks added yet</p>
                      )}
            
                      <ul className="space-y-2">
                        {watchlist.map(stock => (
                          <li
                            key={stock}
                            className="flex justify-between items-center bg-gray-100 p-3 rounded-lg shadow-sm hover:shadow-md transition"
                          >
                            {stock.replace(".NS", "")}
            
                            <button
                              onClick={() => removeStock(stock)}
                              className="text-red-500 hover:text-red-700 text-lg font-bold"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
            
                      <button
                        onClick={saveConfig}
                        disabled={!firebaseUser}
                        className="mt-4 w-full bg-green-500 text-white p-2 rounded-lg disabled:bg-gray-300"
                      >
                        {saving ? "Saving..." : "💾 Save"}
                      </button>
                  </>
              )}

              {activeTab === "summary" && (
                <div className="text-center p-4">
                  <h2 className="text-lg font-semibold mb-4">📊 Today's Market</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">NIFTY</p>
                      <p
                      className={`text-xl font-bold ${
                        marketSummary.nifty.change >= 0
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {marketSummary.nifty.change >= 0 ? "+" : ""}
                      {marketSummary.nifty.change.toFixed(2)}%
                    </p>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">SENSEX</p>
                      <p
                        className={`text-xl font-bold ${
                          marketSummary.sensex.change >= 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {marketSummary.sensex.change >= 0 ? "+" : ""}
                        {marketSummary.sensex.change.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-4">
                    Compared to previous close
                  </p>
                </div>
              )}

            </>
        )}
  
      </div>
    </div>
  );
}

export default App;
