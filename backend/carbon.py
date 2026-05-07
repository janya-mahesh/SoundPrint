# Carbon cost estimates based on published ML energy research
# Sources: Patterson et al. 2021, Lottick et al. 2019, Luccioni et al. 2023

MODEL_ENERGY = {
    # Wh per 1000 tokens (input + output combined estimate)
    "gpt-4": 0.0173,
    "gpt-4o": 0.0087,
    "gpt-3.5-turbo": 0.0026,
    "claude-3-opus": 0.0160,
    "claude-3-sonnet": 0.0080,
    "claude-3-haiku": 0.0020,
    "claude-sonnet-4": 0.0085,
    "gemini-pro": 0.0060,
    "gemini-flash": 0.0018,
    "default": 0.0050,
}

# Global average grid carbon intensity: 475g CO2 per kWh (IEA 2023)
GRID_CARBON_G_PER_KWH = 475

# Water usage: ~1.8L per kWh for data center cooling (average estimate)
WATER_L_PER_KWH = 1.8

# Driving equivalent: avg car emits 170g CO2 per km
CAR_G_PER_KM = 170


def estimate_cost(token_count: int, model: str = "default") -> dict:
    model_key = "default"
    for key in MODEL_ENERGY:
        if key in model.lower():
            model_key = key
            break

    energy_wh = (token_count / 1000) * MODEL_ENERGY[model_key]
    energy_kwh = energy_wh / 1000

    co2_grams = energy_kwh * GRID_CARBON_G_PER_KWH
    water_ml = energy_kwh * WATER_L_PER_KWH * 1000
    driving_m = (co2_grams / CAR_G_PER_KM) * 1000  # metres

    return {
        "token_count": token_count,
        "model": model_key,
        "energy_wh": round(energy_wh, 6),
        "co2_grams": round(co2_grams, 4),
        "water_ml": round(water_ml, 3),
        "driving_metres": round(driving_m, 2),
    }


def compare_costs(original_tokens: int, rewritten_tokens: int, model: str = "default") -> dict:
    original = estimate_cost(original_tokens, model)
    rewritten = estimate_cost(rewritten_tokens, model)

    saved_co2 = original["co2_grams"] - rewritten["co2_grams"]
    saved_pct = ((original_tokens - rewritten_tokens) / original_tokens * 100) if original_tokens > 0 else 0

    return {
        "original": original,
        "rewritten": rewritten,
        "saved_co2_grams": round(saved_co2, 4),
        "saved_tokens": original_tokens - rewritten_tokens,
        "saved_percent": round(saved_pct, 1),
    }