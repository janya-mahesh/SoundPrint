
<div align="center">
  <h1>🌱 SoundPrint</h1>
  <p><strong>A Chrome extension that estimates the carbon cost of your AI prompts — and rewrites them to be more efficient.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/status-active-brightgreen" />
    <img src="https://img.shields.io/badge/platform-Chrome-blue" />
    <img src="https://img.shields.io/badge/backend-Flask%20%2B%20Ollama-orange" />
    <img src="https://img.shields.io/badge/license-MIT-lightgrey" />
  </p>
</div>

---

## The Problem

Every prompt you send to an LLM consumes energy. Most users have no idea how much — and no tools exist to reduce it in real time. Awareness-only carbon trackers tell you the number but do nothing with it. SoundPrint closes that loop.

---

## What It Does

When you type a prompt on ChatGPT, Claude, or Gemini and press send, SoundPrint intercepts it before it leaves your browser. It:

1. Counts the tokens in your prompt
2. Estimates the CO₂ cost based on published model energy research
3. Uses a local LLM (Qwen2 via Ollama) to rewrite your prompt to be shorter while preserving full intent
4. Shows you a comparison card — original vs rewritten, tokens saved, CO₂ saved
5. Lets you accept the rewrite or send the original — your choice
6. Tracks cumulative savings across your session in the popup dashboard

The rewrite engine is what makes this different. Every other carbon tool stops at measurement. SoundPrint turns passive awareness into active reduction.

---

## Demo

> The SoundPrint card appears before your prompt is sent, showing token count, CO₂ estimate, and a suggested rewrite.

![SoundPrint card demo](https://raw.githubusercontent.com/janya-mahesh/SoundPrint/main/assets/demo.png)

<img width="1303" height="707" alt="image" src="https://github.com/user-attachments/assets/ad52dea4-abf8-4d0b-b6dc-c889b58d0afe" />


---

## Architecture
<img width="1530" height="1306" alt="image" src="https://github.com/user-attachments/assets/5daaadc5-7a05-4e40-a2eb-3a3da6c71ac6" />


**Request flow:**
User types prompt
→ content.js intercepts on Enter/Send
→ POST /analyze to Flask backend
→ carbon.py estimates cost
→ rewriter.py compresses prompt via Qwen2
→ SoundPrint card shown to user
→ User accepts rewrite or sends original
→ Event logged to background.js
→ Popup dashboard shows session totals

---

## Carbon Estimation Methodology

Energy and emissions estimates are derived from published ML sustainability research:

| Source | Used For |
|--------|----------|
| Patterson et al., 2021 | GPT-scale model energy baselines |
| Lottick et al., 2019 | Per-token inference energy estimates |
| Luccioni et al., 2023 | Per-query CO₂ for production LLMs |
| IEA, 2023 | Global average grid intensity: 475g CO₂ per kWh |
| Various data center studies | Water usage: 1.8L per kWh for cooling |

CO₂ is displayed in the most readable unit automatically — µg for short prompts, mg for medium, g for large sessions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Extension | JavaScript, Chrome Extensions API (Manifest V3) |
| Backend | Python, Flask, flask-cors |
| Token counting | tiktoken (cl100k_base) |
| Prompt rewriting | Qwen2:0.5b via Ollama — runs locally, fully free |
| Supported platforms | ChatGPT, Claude, Gemini |

---

## Local Setup

### Prerequisites

- Python 3.11 or later
- Google Chrome
- [Ollama](https://ollama.com/download) installed and running

### 1. Clone the repo

```bash
git clone https://github.com/janya-mahesh/SoundPrint.git
cd SoundPrint
```

### 2. Pull the rewriter model

```bash
ollama pull qwen2:0.5b
```

### 3. Start the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Backend will start at `http://localhost:5050`. You should see:
SoundPrint backend starting on http://localhost:5050

### 4. Load the Chrome extension

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. Pin the 🌱 SoundPrint icon to your toolbar

### 5. Use it

Go to ChatGPT, Claude, or Gemini. Type any prompt longer than 20 words and press Enter. The SoundPrint card will appear before your message is sent.

---

## Research Basis

- Luccioni, A. S., Viguier, S., & Ligozat, A. L. (2023). *Estimating the Carbon Footprint of BLOOM, a 176B Parameter Language Model.* Journal of Machine Learning Research.
- Patterson, D., et al. (2021). *Carbon Emissions and Large Neural Network Training.* arXiv:2104.10350.
- Lottick, K., et al. (2019). *Energy Usage Reports: Environmental awareness as part of algorithmic accountability.* NeurIPS Workshop on Tackling Climate Change with ML.

---

## Roadmap

- [ ] Per-model energy profiles with more granular accuracy
- [ ] Session carbon report as downloadable CSV
- [ ] Firefox extension support
- [ ] Semantic density scoring — not just token length but information per token
- [ ] Team dashboard for enterprise prompt efficiency tracking

---

## Author

**Janya Mahesh**
B.Tech CSE, PES University, Bengaluru

[LinkedIn](https://linkedin.com/in/janya-mahesh-a4a813323) · [GitHub](https://github.com/janya-mahesh)

---

## License

MIT
