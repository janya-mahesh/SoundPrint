// Stores session events across tabs
let sessionEvents = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "ADD_EVENT") {
    sessionEvents.push(message.event);
    chrome.storage.local.set({ sessionEvents });
    sendResponse({ ok: true });
  }

  if (message.type === "GET_SESSION") {
    sendResponse({ events: sessionEvents });
  }

  if (message.type === "CLEAR_SESSION") {
    sessionEvents = [];
    chrome.storage.local.set({ sessionEvents: [] });
    sendResponse({ ok: true });
  }

  return true; // keep channel open for async
});