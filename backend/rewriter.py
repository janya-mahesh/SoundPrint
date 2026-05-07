import requests
import json


OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2:0.5b"

SYSTEM_PROMPT = """You are a prompt compression assistant. Your only job is to rewrite the user's prompt to be shorter and more efficient while preserving the complete meaning and intent. 

Rules:
- Remove filler words, redundant phrases, and unnecessary politeness
- Keep all technical terms, specific names, numbers, and constraints exactly as they are
- Do not change the question or request being made
- Do not add explanation or commentary
- Return ONLY the rewritten prompt, nothing else
- If the prompt is already very short (under 20 words), return it unchanged"""


def rewrite_prompt(prompt: str) -> dict:
    payload = {
        "model": MODEL,
        "prompt": f"{SYSTEM_PROMPT}\n\nOriginal prompt:\n{prompt}\n\nRewritten prompt:",
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 500,
        }
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        rewritten = data.get("response", "").strip()

        # Clean up common Phi-3 artifacts
        for prefix in ["Rewritten prompt:", "Here is", "Here's", "Output:"]:
            if rewritten.lower().startswith(prefix.lower()):
                rewritten = rewritten[len(prefix):].strip()

        return {
            "success": True,
            "rewritten": rewritten,
            "original_length": len(prompt),
            "rewritten_length": len(rewritten),
        }

    except requests.exceptions.Timeout:
        return {"success": False, "error": "Ollama timeout — is it running?", "rewritten": prompt}
    except Exception as e:
        return {"success": False, "error": str(e), "rewritten": prompt}