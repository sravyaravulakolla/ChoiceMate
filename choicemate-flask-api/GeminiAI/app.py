
import os
import google.generativeai as genai
import json
import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime
import random
import time

api_keys = [
    os.getenv("GEMINI_API_KEY1"), os.getenv("GEMINI_API_KEY2"),
    os.getenv("GEMINI_API_KEY3"), os.getenv("GEMINI_API_KEY4"),
    os.getenv("GEMINI_API_KEY5"), os.getenv("GEMINI_API_KEY6"),
    os.getenv("GEMINI_API_KEY7"), os.getenv("GEMINI_API_KEY8"),
    os.getenv("GEMINI_API_KEY9")
]


# ---------- Configuration ----------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini = genai.GenerativeModel("gemini-1.5-pro")

# ---------- Load Data ----------
data_pkl_path = r"C:\Users\Vaishnavi\4-2\MajorProject\ChoiceMate\choicemate-flask-api\data\combined_products.pkl"
df_combined = pd.read_pickle(data_pkl_path)
df_combined['id'] = df_combined.index + 1

# ---------- Utility Functions ----------
def get_subcategories_by_category(category):
    subcats = df_combined[df_combined['category'] == category]['subcategory'].unique()
    return set(subcats)
def call_gemini_with_retries(prompt, timeout_seconds=120):
    start_time = time.time()
    last_exception = None

    while (time.time() - start_time) < timeout_seconds:
        for key in api_keys:
            try:
                genai.configure(api_key=key)
                gemini = genai.GenerativeModel("gemini-1.5-pro")
                response = gemini.generate_content(prompt)
                return response
            except Exception as e:
                print(f"[{datetime.now()}] Error with API key {key[:6]}...: {e}")
                last_exception = e
                time.sleep(random.uniform(1.5, 3.0))  # brief cooldown between keys

    print("All keys failed after 2 minutes.")
    raise last_exception

def get_relevant_subcategories(category, query, combined_subcats):
    prompt = f"""
You are a smart shopping assistant helping users find products.

The user selected the main category: "{category}"  
They described their need with the query: "{query}"

Below is a list of available subcategories under that category:
{combined_subcats}

Your task is to:
- Carefully analyze the query and match it semantically with the most relevant subcategories.
- Return ONLY the 5 to 7 most suitable subcategories from the list.
- Exclude any unrelated or generic subcategories that don't clearly match the query intent.

Return your answer as a clean Python list like:
['Subcategory A', 'Subcategory B', 'Subcategory C']
Only return the list, nothing else.
"""
    response = call_gemini_with_retries(prompt)
    try:
        relevant_subcats = eval(response.text)
    except Exception:
        relevant_subcats = list(combined_subcats)  # Fallback
    return relevant_subcats


def get_gemini_ranked_products(category, query, product_list):
    prompt = f"""
You are a smart shopping assistant. A user asked: "{query}".

Below is a list of products in the "{category}" category. Each product includes id, cleaned_description, price, and rating.

Please recommend the top 5 most relevant products to the user's query.
Respond in this JSON format:
[
  {{
    "id": "....",
    "price": ..., 
    "rating": ..., 
    "cleaned_description": "...", 
    "reason": "..."
  }},
  ...
]
Products:
{json.dumps(product_list, indent=2)}
"""
    response = call_gemini_with_retries(prompt)
    response_text = response.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text.replace("```json", "").replace("```", "").strip()

    try:
        recommendations = json.loads(response_text)
        final_recommendations = []
        for item in recommendations:
            product_row = df_combined[df_combined['id'] == int(item['id'])].iloc[0]

            final_recommendations.append({
                "id": item['id'],
                "title": product_row['title'],
                "price": item['price'],
                "rating": item['rating'],
                "description": product_row['description'],
                "reason": item['reason'],
                "link": product_row['product_link'],
            })
        return final_recommendations

    except json.JSONDecodeError:
        return []  # Better than crashing the API


# ---------- Flask App ----------
app = Flask(__name__)

@app.route('/recommend', methods=['POST'])
def recommend():
    print(f"Received request at {datetime.now()}")
    data = request.json
    category = data.get("category")
    query = data.get("query")
    budget = data.get("budget", None)

    if not category or not query:
        return jsonify({"error": "Missing category or query"}), 400

    subcategories = df_combined[df_combined['category'] == category]['subcategory'].unique().tolist()
    selected_subcats = get_relevant_subcategories(category, query, subcategories)
    filtered_df = df_combined[df_combined['subcategory'].isin(selected_subcats)].copy()

    if budget:
        filtered_df['price'] = filtered_df['price'].replace({',': ''}, regex=True).astype(float)
        filtered_df = filtered_df[filtered_df['price'] <= float(budget)]

    product_list = [
        {
            "id": row["id"],
            "price": row["price"],
            "rating": row["rating"],
            "cleaned_description": row["cleaned_description"]
        }
        for _, row in filtered_df.iterrows()
    ]

    ranked_products = get_gemini_ranked_products(category, query, product_list)
    return jsonify({"recommendations": ranked_products})


if __name__ == '__main__':
    app.run(debug=True,port=8000)
