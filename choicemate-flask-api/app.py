from flask import Flask, request, jsonify
from utils.data_loader import load_and_preprocess_data
from dotenv import load_dotenv
import os
import re
import json
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = Flask(__name__)
df = load_and_preprocess_data()
df.reset_index(drop=True, inplace=True)
df['id'] = df.index + 1  # Unique ID starting from 1

def match_category(query, category_list):
    # category_list = list(categories)
    prompt = f"""
    You are a smart categorizer for an e-commerce shopping assistant.

    The user asked: "{query}"

    Choose the most relevant category from the list below:
    {json.dumps(category_list, indent=2)}

    Respond ONLY with the name of the best matching category.
    """

    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    result = response.text.strip().strip('"')
    print("Category ",result)
    # Return only if Gemini returns a valid known category
    if result in category_list:
        return result
    return None


@app.route('/recommend', methods=['POST'])
def recommend():
    user_query = request.json.get("query")
    budget = request.json.get("budget", 100000)
    print(user_query)
    query_category = match_category(user_query, df['category'].unique().tolist())
    if not query_category:
        return jsonify({"error": "No matching category found."}), 400

    filtered_df = df[df['category'] == query_category].copy()
    filtered_df = filtered_df[filtered_df['price'] <= float(budget)]
    print("length",len(filtered_df))
    if filtered_df.empty:
        return jsonify({"error": "No products found under the selected category and price range."}), 404

    top_candidates = filtered_df.sort_values(by='rating', ascending=False).head(50)

    product_list = []
    for _, row in top_candidates.iterrows():
        product_list.append({
            "title": row["title"],
            "price": row["price"],
            "rating": row["rating"],
            "description": row["description"],
            "link":row["product_link"],
            "id": row["id"],
        })

    gemini_prompt = f"""
    You are a smart shopping assistant. A user asked: "{user_query}".

    Below is a list of products in the "{query_category}" category. Each product includes id, title, description, price, and rating.

    Please recommend the top 5 most relevant products to the user's query.
    Respond in this JSON format:
    [
      {{
        "id":"....",
        "title": "...",
        "price": ...,
        "rating": ...,
        "description": "...",
        "reason": "..."

      }},
      ...
    ]

    Products:
    {json.dumps(product_list, indent=2)}
    """

    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(gemini_prompt)
    
    # Extract actual JSON from the response (removing ```json\n...\n``` if present)
    response_text = response.text.strip()
    if response_text.startswith("```json"):
        response_text = response_text.replace("```json", "").replace("```", "").strip()

    try:
        recommendations = json.loads(response_text)
        # Add full details (e.g., product_link) using the IDs from Gemini response
        final_recommendations = []
        for item in recommendations:
            product_row = df[df['id'] == int(item['id'])].iloc[0]  # Safe because id is unique

            final_recommendations.append({
                "id": item['id'],
                "title": item['title'],
                "price": item['price'],
                "rating": item['rating'],
                "description": item['description'],
                "reason": item['reason'],
                "link": product_row['product_link'],  # Add link from original DataFrame
            })

    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse Gemini response as JSON", "raw_response": response_text}), 500

    return jsonify({"recommendations": final_recommendations})


if __name__ == '__main__':
    app.run(debug=True, port=8000)
