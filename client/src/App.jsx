import { useEffect, useState } from "react";
import axios from "axios";

const STOCK_OPTIONS = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS"
];

const USER_ID = "gargi"; // same as Mongo

function App() {
  const [threshold, setThreshold] = useState(2);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedStock, setSelectedStock] = useState(STOCK_OPTIONS[0]);

  // 🔹 Load user data
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get(`https://stock-alert-api-734i.onrender.com/user/${USER_ID}`);
  
        if (res.data) {
          setWatchlist(res.data.watchlist || []);
          setThreshold(res.data.threshold || 2);
        }
      } catch (err) {
        console.error("Error fetching user:", err.message);
      }
    }
  
    fetchUser();
  }, []);

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
  
      await axios.post("https://stock-alert-api-734i.onrender.com/user/update", {
        userId: USER_ID,
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
  
        <h2 className="text-2xl font-bold mb-4 text-indigo-600">
          📈 Stock Alert App
        </h2>
  
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
          className="mt-4 w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition"
        >
          {saving ? "Saving..." : "💾 Save"}
        </button>
  
      </div>
    </div>
  );
}

export default App;
