import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, STOCK_OPTIONS, DEFAULT_USER_ID } from "./config/constants";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { messagingPromise } from "./firebase";
import { getToken } from "firebase/messaging";

function App() {
  const [userStatus, setUserStatus] = useState("idle"); 
// "idle" | "checking" | "exists" | "new" | "error"
  const [threshold, setThreshold] = useState(2);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedStock, setSelectedStock] = useState(STOCK_OPTIONS[0]);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


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

  
      console.log("FCM Token:", token);
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

      console.log("👉 Calling getDeviceToken...");
      const token = await getDeviceToken();
      console.log("Token is: ", token)


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

  const addStock = () => {
    if (!watchlist.includes(selectedStock)) {
      setWatchlist([...watchlist, selectedStock]);
    }
  };

  const removeStock = (stock) => {
    setWatchlist(watchlist.filter(s => s !== stock));
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
              <div className="flex gap-2">
                <button onClick={login} className="bg-blue-500 text-white px-4 py-2 rounded">
                  Login
                </button>
                <button onClick={signup} className="bg-gray-500 text-white px-4 py-2 rounded">
                  Signup
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm">
              <div className="text-sm text-green-600">
                👤 {firebaseUser.email}
                {userStatus === "exists" && " • User found ✅"}
                {userStatus === "checking" && " • Checking..."}
                {userStatus === "error" && " • Error ❌"}
              </div>
            </div>
          )}
        </div>
  
        {/* 🔒 ONLY SHOW APP AFTER LOGIN */}
        {firebaseUser && (
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
                value={selectedStock}
                onChange={(e) => setSelectedStock(e.target.value)}
                className="flex-1 border rounded-lg p-2"
              >
                {STOCK_OPTIONS
                  .filter(stock => !watchlist.includes(stock))
                  .map(stock => (
                    <option key={stock} value={stock}>
                      {stock.replace(".NS", "")}
                    </option>
                ))}
              </select>
  
              <button
                onClick={addStock}
                className="bg-indigo-500 text-white px-4 rounded-lg"
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
  
      </div>
    </div>
  );
}

export default App;
