import os
import google.generativeai as genai
import json
# Replace with your Gemini client initialization


genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini =genai.GenerativeModel("gemini-1.5-pro")


def get_subcategories_by_category(category):
    subcats = df_combined[df_combined['category'] == category]['subcategory'].unique()
    return set(subcats)

# Get relevant subcategories using Gemini
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

 For example:
- If category is "Headphones & Earbuds" and query is "wireless headphones for running", choose subcategories like ["Wireless Headphones", "Sports Earbuds"]
- If category is "Women's Clothing" and query is "kurti for Diwali", choose ["Kurtis", "Anarkali Kurtas", "Ethnic Sets"]

 Avoid:
- Returning all subcategories.
- Including irrelevant ones like "Socks", "Jeans", "Blazers", or "Track Pants" for a traditional wear query.

Return your answer as a clean Python list like:
['Subcategory A', 'Subcategory B', 'Subcategory C']
Only return the list, nothing else.
"""

   
    response = gemini.generate_content(prompt)
    try:
        relevant_subcats = eval(response.text)
    except Exception:
        relevant_subcats = list(combined_subcats)  # Fallback
    return relevant_subcats



def get_gemini_subcategories(category, query, subcategories):
    prompt = f"""
You are a smart product assistant.

Main category: "{category}"
User query: "{query}"
Available subcategories:
{subcategories}

Return a Python list of 5 to 7 subcategories that best match the user query. Avoid generic or unrelated ones.
Only return the list, nothing else.
"""
    response = gemini.generate_content(prompt)
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse Gemini response"}

def get_gemini_ranked_products(category ,query, product_list):
    prompt = f"""
You are a smart shopping assistant. A user asked: "{query}".

Below is a list of products in the "{category}" category. Each product includes id, cleaned_description, price, and rating.

{product_list}
Please recommend the top 5 most relevant products to the user's query.
Respond in this JSON format:
[
  {{
    "id":"....",
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
    response = gemini.generate_content(prompt)
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
                "title": product_row['title'],
                "price": item['price'],
                "rating": item['rating'],
                "description": product_row['description'],
                "reason": item['reason'],
                "link": product_row['product_link'],  # Add link from original DataFrame
            })

    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse Gemini response as JSON", "raw_response": response_text}), 500

    return jsonify({"recommendations": final_recommendations})

    return response.text  # or json.loads if using structured format
