import google.generativeai as genai
import json

genai.configure(api_key="YOUR_GEMINI_API_KEY")

def get_recommendations(user_query, df, category):
    product_list = []
    for _, row in df.iterrows():
        product_list.append({
            "title": row["title"],
            "price": row["price"],
            "rating": row["rating"],
            "description": row["description"]
        })

    prompt = f"""
You are a smart shopping assistant. A user asked: "{user_query}".

Here is a list of products in the "{category}" category. Each product includes title, description, price, and rating.

Please recommend the top 5 most relevant products to the user's query.
Respond in this JSON format:

[
  {{
    "title": "...",
    "price": ...,
    "description": "...",
    "rating": ...,
    "reason": "Why it's a good fit"
  }},
  ...
]

Products:
{json.dumps(product_list, indent=2)}
"""

    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    
    try:
        recommendations = json.loads(response.text)
    except Exception:
        recommendations = [{"error": "Failed to parse Gemini response", "raw": response.text}]
    
    return recommendations
