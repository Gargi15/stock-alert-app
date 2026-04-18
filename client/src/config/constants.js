// 🌍 Environment toggle
const isDev = import.meta.env.DEV;

// 🔗 Backend URLs
export const API_URL = isDev
  ? "http://localhost:3000"
  : "https://stock-alert-api-734i.onrender.com";

// 📊 Stock options
export const STOCK_OPTIONS = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS"
];

export const DEFAULT_USER_ID = "gargi" // same as mongo