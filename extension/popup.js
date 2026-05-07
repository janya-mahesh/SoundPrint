const BACKEND = "http://localhost:5050";

function formatCO2(grams) {
  if (grams === 0) return "0µg";
  if (grams < 0.0001) return (grams * 1e6).toFixed(1) + "µg";
  if (grams < 0.1) return (grams * 1000).toFixed(3) + "mg";
  return grams.toFixed(4) + "g";
}

async function checkBackend() {
  try {
    const res = await fetch(`${BACKEND}/health`);
    if (res.ok) {
      document.getElementById("status-dot").classList.add("online");
      document.getElementById("status-text").textContent = "Backend connected";
    } else {
      throw new Error();
    }
  } catch {
    document.getElementById("status-text").textContent = "Backend offline — run app.py";
  }
}

async function loadStats() {
  chrome.runtime.sendMessage({ type: "GET_SESSION" }, async (response) => {
    const events = response?.events || [];
    if (events.length === 0) return;

    try {
      const res = await fetch(`${BACKEND}/session-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      const data = await res.json();

      document.getElementById("prompts-sent").textContent = data.prompts_sent;
      document.getElementById("rewrites-accepted").textContent = data.rewrites_accepted;
      document.getElementById("total-co2").textContent = formatCO2(data.total_co2_grams);
      document.getElementById("saved-co2").textContent = formatCO2(data.saved_co2_grams);
      document.getElementById("saved-tokens").textContent = data.saved_tokens;
      document.getElementById("saved-pct").textContent = data.saved_percent + "%";
    } catch (e) {
      console.error("Could not load stats:", e);
    }
  });
}

document.getElementById("clear-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_SESSION" }, () => {
    document.getElementById("prompts-sent").textContent = "0";
    document.getElementById("rewrites-accepted").textContent = "0";
    document.getElementById("total-co2").textContent = "0µg";
    document.getElementById("saved-co2").textContent = "0µg";
    document.getElementById("saved-tokens").textContent = "0";
    document.getElementById("saved-pct").textContent = "0%";
  });
});

checkBackend();
loadStats();