import axios from "axios";
import crypto from "crypto";

// MEXC API credentials
const API_KEY = "mx0vgloJ67rZEhuPDu";
const SECRET_KEY = "fc1e735724164b07b262558390d55a10";

const BASE_URL = "https://api.mexc.com";

async function getServerTime() {
  const url = `${BASE_URL}/api/v3/time`;  // MEXC server time endpoint
  try {
    const response = await axios.get(url);
    return response.data.serverTime;
  } catch (error) {
    console.error("Error fetching server time:", error);
    return null;
  }
}

async function getDepositAddress(coin, network) {
  const serverTime = await getServerTime();
  if (!serverTime) return;  // Exit if we can't fetch the server time

  const timestamp = serverTime;  // Use the MEXC server time
  const recvWindow = 5000; // Default time window in ms (5 seconds)

  const endpoint = "/api/v3/capital/deposit/address";
  const queryString = `coin=${coin}&network=${network}&timestamp=${timestamp}&recvWindow=${recvWindow}`;

  // Generate HMAC signature
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(queryString)
    .digest("hex");

  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  try {
    const response = await axios.post(url, null, {
      headers: {
        "X-MEXC-APIKEY": API_KEY,
        "Content-Type": "application/json",
      },
    });
    console.log("Response from MEXC:", response.data);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}

// Test the function
getDepositAddress("LTC", "LTC");