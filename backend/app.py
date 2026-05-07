from flask import Flask, request, jsonify
from flask_cors import CORS
import tiktoken

from carbon import estimate_cost, compare_costs
from rewriter import rewrite_prompt

app = Flask(__name__)
CORS(app, origins=["*"])  # Chrome extension needs this

enc = tiktoken.get_encoding("cl100k_base")  # works for GPT-4, Claude approximation


def count_tokens(text: str) -> int:
    return len(enc.encode(text))


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "SoundPrint backend running"})


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Takes a prompt, counts tokens, estimates cost, rewrites it, compares.
    Body: { "prompt": "...", "model": "gpt-4o" }
    """
    data = request.get_json()
    if not data or "prompt" not in data:
        return jsonify({"error": "Missing prompt"}), 400

    prompt = data["prompt"].strip()
    model = data.get("model", "default")

    if len(prompt) < 10:
        return jsonify({"error": "Prompt too short to analyze"}), 400

    original_tokens = count_tokens(prompt)

    # Get rewritten version from Phi-3
    rewrite_result = rewrite_prompt(prompt)
    rewritten_text = rewrite_result["rewritten"]
    rewritten_tokens = count_tokens(rewritten_text)

    # Carbon comparison
    comparison = compare_costs(original_tokens, rewritten_tokens, model)

    return jsonify({
        "original_prompt": prompt,
        "rewritten_prompt": rewritten_text,
        "rewrite_success": rewrite_result["success"],
        "comparison": comparison,
    })


@app.route("/session-summary", methods=["POST"])
def session_summary():
    """
    Takes a list of {original_tokens, rewritten_tokens, model, accepted} events
    and returns session totals.
    """
    data = request.get_json()
    events = data.get("events", [])

    total_original_co2 = 0
    total_saved_co2 = 0
    total_original_tokens = 0
    total_saved_tokens = 0
    prompts_sent = len(events)
    rewrites_accepted = 0

    for e in events:
        orig_cost = estimate_cost(e.get("original_tokens", 0), e.get("model", "default"))
        rew_cost = estimate_cost(e.get("rewritten_tokens", 0), e.get("model", "default"))
        total_original_co2 += orig_cost["co2_grams"]
        if e.get("accepted", False):
            total_saved_co2 += orig_cost["co2_grams"] - rew_cost["co2_grams"]
            total_saved_tokens += e.get("original_tokens", 0) - e.get("rewritten_tokens", 0)
            rewrites_accepted += 1
        total_original_tokens += e.get("original_tokens", 0)

    return jsonify({
        "prompts_sent": prompts_sent,
        "rewrites_accepted": rewrites_accepted,
        "total_co2_grams": round(total_original_co2, 4),
        "saved_co2_grams": round(total_saved_co2, 4),
        "saved_tokens": total_saved_tokens,
        "saved_percent": round((total_saved_tokens / total_original_tokens * 100) if total_original_tokens > 0 else 0, 1),
    })


if __name__ == "__main__":
    print("SoundPrint backend starting on http://localhost:5050")
    app.run(debug=True, port=5050)