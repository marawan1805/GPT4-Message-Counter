const API_BASE = "https://gpt4-counter.vercel.app/api";
const MESSAGE_LIMIT = 25;
const RESET_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const userId = getUserIdFromHeaders(details.requestHeaders);
    if (!userId || details.method !== "POST" || !isGPT4Request(details)) {
      return;
    }

    const { count, resetAt } = await getCountAndResetAt(userId);
    if (count < MESSAGE_LIMIT && (resetAt === null || Date.now() < resetAt)) {
      incrementCount(userId);
    } else {
      resetCount(userId);
    }
  },
  { urls: ["https://chat.openai.com/backend-api/conversation"] },
  ["requestHeaders", "blocking"]
);

function getUserIdFromHeaders(headers) {
  const authHeader = headers.find((header) => header.name === "authorization");
  if (!authHeader) return null;
  const token = authHeader.value.replace("Bearer ", "");
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    return decoded["https://api.openai.com/auth"].user_id;
  } catch (error) {
    console.error("Error decoding JWT token:", error);
    return null;
  }
}

function isGPT4Request(details) {
  try {
    const body = JSON.parse(decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))));
    return body.options?.model === "gpt-4";
  } catch (error) {
    console.error("Error parsing request body:", error);
    return false;
  }
}

async function getCountAndResetAt(userId) {
  const result = await new Promise((resolve) => {
    chrome.storage.sync.get([userId], (items) => {
      resolve(items[userId] || { count: 0, resetAt: null });
    });
  });
  return result;
}

function incrementCount(userId) {
  getCountAndResetAt(userId).then(({ count, resetAt }) => {
    count++;
    if (resetAt === null) {
      resetAt = Date.now() + RESET_INTERVAL;
    }
    chrome.storage.sync.set({ [userId]: { count, resetAt } });
    fetch(`${API_BASE}/messages?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });
}

function resetCount(userId) {
  chrome.storage.sync.set({ [userId]: { count: 0, resetAt: null } });
  fetch(`${API_BASE}/messages?userId=${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
}
