const BACKEND = "http://localhost:5050";

// Which site are we on?
function detectSite() {
  const host = window.location.hostname;
  if (host.includes("chatgpt.com") || host.includes("openai.com")) return "chatgpt";
  if (host.includes("claude.ai")) return "claude";
  if (host.includes("gemini.google.com")) return "gemini";
  return null;
}

function formatCO2(grams) {
  if (grams === 0) return "0µg";
  if (grams < 0.0001) return (grams * 1e6).toFixed(1) + "µg";
  if (grams < 0.1) return (grams * 1000).toFixed(3) + "mg";
  return grams.toFixed(4) + "g";
}

// Get the textarea element depending on site
function getTextarea() {
  const site = detectSite();
  if (site === "chatgpt") return document.querySelector("#prompt-textarea");
  if (site === "claude") return document.querySelector('[contenteditable="true"]');
  if (site === "gemini") {
    return (
      document.querySelector(".ql-editor") ||
      document.querySelector("rich-textarea .ql-editor") ||
      document.querySelector("[contenteditable='true']")
    );
  }
  return null;
}

function getSubmitButton() {
  const site = detectSite();
  if (site === "chatgpt") return document.querySelector('[data-testid="send-button"]');
  if (site === "claude") return document.querySelector('[aria-label="Send message"]');
  if (site === "gemini") {
    return (
      document.querySelector("button.send-button") ||
      document.querySelector('[aria-label="Send message"]') ||
      document.querySelector('[data-mat-icon-name="send"]')?.closest("button") ||
      document.querySelector("button[aria-label='Send message (enter)']") ||
      document.querySelector(".send-button-container button") ||
      document.querySelector("toolbar-button button")
    );
  }
  return null;
}

// Get text from textarea (handles contenteditable too)
function getPromptText(el) {
  if (!el) return "";
  return el.innerText || el.value || "";
}

// Set text back into textarea
function setPromptText(el, text) {
  if (!el) return;
  if (el.tagName === "TEXTAREA") {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // contenteditable
    el.innerText = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    // move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// Remove existing SoundPrint card if present
function removeCard() {
  const existing = document.getElementById("soundprint-card");
  if (existing) existing.remove();
}

// Build and show the overlay card
function showCard(data, textarea, originalText, onAccept, onSkip) {
  removeCard();

  const c = data.comparison;
  const savedPct = c.saved_percent;
  const savedCO2 = c.saved_co2_grams;
  const originalCO2 = c.original.co2_grams;

  const card = document.createElement("div");
  card.id = "soundprint-card";
  card.innerHTML = `
    <div class="sp-header">
      <span class="sp-logo">🌱 SoundPrint</span>
      <button class="sp-close" id="sp-close-btn">✕</button>
    </div>
    <div class="sp-metrics">
      <div class="sp-metric">
        <div class="sp-metric-label">Original</div>
        <div class="sp-metric-value">${c.original.token_count} tokens</div>
        <div class="sp-metric-sub">${formatCO2(originalCO2)} CO₂</div>
      </div>
      <div class="sp-arrow">→</div>
      <div class="sp-metric sp-metric-green">
        <div class="sp-metric-label">Rewritten</div>
        <div class="sp-metric-value">${c.rewritten.token_count} tokens</div>
        <div class="sp-metric-sub">${formatCO2(c.rewritten.co2_grams)} CO₂</div>
      </div>
      <div class="sp-metric sp-metric-save">
        <div class="sp-metric-label">Saved</div>
        <div class="sp-metric-value sp-save-pct">${savedPct}%</div>
        <div class="sp-metric-sub">${formatCO2(savedCO2)} CO₂</div>
      </div>
    </div>
    <div class="sp-rewrite-box">
      <div class="sp-rewrite-label">Suggested rewrite:</div>
      <div class="sp-rewrite-text" id="sp-rewrite-text">${data.rewritten_prompt}</div>
    </div>
    <div class="sp-actions">
      <button class="sp-btn sp-btn-accept" id="sp-accept-btn">✓ Use rewrite</button>
      <button class="sp-btn sp-btn-skip" id="sp-skip-btn">Send original</button>
    </div>
  `;

  document.body.appendChild(card);

  document.getElementById("sp-accept-btn").addEventListener("click", () => {
    onAccept();
    removeCard();
  });

  document.getElementById("sp-skip-btn").addEventListener("click", () => {
    onSkip();
    removeCard();
  });

  document.getElementById("sp-close-btn").addEventListener("click", () => {
    onSkip();
    removeCard();
  });
}

// Log event to background
function logEvent(event) {
  chrome.runtime.sendMessage({ type: "ADD_EVENT", event });
}

// Main intercept logic
let isProcessing = false;
let skipNextIntercept = false;

async function interceptSubmit(e) {
  if (isProcessing) return;
  if (skipNextIntercept) {
    skipNextIntercept = false;
    return;
  }

  const textarea = getTextarea();
  const promptText = getPromptText(textarea).trim();

  if (!promptText || promptText.length < 20) return;

  // Don't intercept if card already showing
  if (document.getElementById("soundprint-card")) return;

  e.preventDefault();
  e.stopPropagation();

  isProcessing = true;

  // Show loading state
  const loadingCard = document.createElement("div");
  loadingCard.id = "soundprint-card";
  loadingCard.innerHTML = `
    <div class="sp-header"><span class="sp-logo">🌱 SoundPrint</span></div>
    <div class="sp-loading">Analysing prompt carbon cost...</div>
  `;
  document.body.appendChild(loadingCard);

  try {
    const response = await fetch(`${BACKEND}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText, model: "gpt-4o" }),
    });

    const data = await response.json();
    removeCard();

    // If rewrite saves less than 10%, not worth showing
    if (data.comparison.saved_percent < 10) {
      logEvent({
        original_tokens: data.comparison.original.token_count,
        rewritten_tokens: data.comparison.rewritten.token_count,
        model: "gpt-4o",
        accepted: false,
        skipped_low_savings: true,
      });
      isProcessing = false;
      // Just send the original
      submitOriginal();
      return;
    }

    showCard(
      data,
      textarea,
      promptText,
      // Accept rewrite
      () => {
        setPromptText(textarea, data.rewritten_prompt);
        logEvent({
          original_tokens: data.comparison.original.token_count,
          rewritten_tokens: data.comparison.rewritten.token_count,
          model: "gpt-4o",
          accepted: true,
        });
        skipNextIntercept = true;
        isProcessing = false;
        setTimeout(() => submitOriginal(), 100);
      },
      // Skip - send original
      () => {
        logEvent({
          original_tokens: data.comparison.original.token_count,
          rewritten_tokens: data.comparison.rewritten.token_count,
          model: "gpt-4o",
          accepted: false,
        });
        isProcessing = false;
        submitOriginal();
      }
    );

  } catch (err) {
    removeCard();
    isProcessing = false;
    console.error("SoundPrint backend unreachable:", err);
    submitOriginal();
  }
}

function submitOriginal() {
  const btn = getSubmitButton();
  if (btn) {
    btn.click();
    return;
  }
  // Fallback — simulate Enter on the textarea
  const textarea = getTextarea();
  if (textarea) {
    textarea.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", code: "Enter", keyCode: 13,
      bubbles: true, cancelable: true
    }));
  }
}
// Attach listener — we watch for Enter key and button click
function attachListeners() {
  const textarea = getTextarea();
  if (textarea) {
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        interceptSubmit(e);
      }
    }, true);
  }

  const btn = getSubmitButton();
  if (btn) {
    btn.addEventListener("click", interceptSubmit, true);
  }
}

// Sites load dynamically so we watch for DOM changes
const observer = new MutationObserver(() => {
  if (getTextarea() && getSubmitButton()) {
    attachListeners();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Try immediately too
setTimeout(attachListeners, 2000);