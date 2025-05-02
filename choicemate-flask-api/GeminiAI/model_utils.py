import os
import pandas as pd
import google.generativeai as genai
from sklearn.metrics.pairwise import cosine_similarity
from transformers import BertTokenizer, BertModel
import torch
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model =genai.GenerativeModel("gemini-1.5-pro")


model_path=r'C:\Users\Vaishnavi\4-2\MajorProject\ChoiceMate\choicemate-flask-api\googlebert-bert-base-uncased'
# Load pre-trained BERT
tokenizer = BertTokenizer.from_pretrained(model_path)
bert_model = BertModel.from_pretrained(model_path)

data_pkl_path=r"C:\Users\Vaishnavi\4-2\MajorProject\ChoiceMate\choicemate-flask-api\data\combined_products.pkl"
# Load product data
df_combined = pd.read_pickle(data_pkl_path)

# Generate sentence embedding using BERT
def encode(text):
    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True)
    with torch.no_grad():
        outputs = bert_model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1)
    return embeddings.numpy()

# Calculate cosine similarity between vectors
def cosine_sim(emb1, emb2):
    return cosine_similarity(emb1, emb2)[0][0]

# Get subcategories for a given category
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

   
    response = gemini_model.generate_content(prompt)
    try:
        relevant_subcats = eval(response.text)
    except Exception:
        relevant_subcats = list(combined_subcats)  # Fallback
    return relevant_subcats

# Get top product recommendations
def get_recommendations(category, query, budget=None, top_k=5):
    # Step 1: Get combined subcategories
    combined_subcats = get_subcategories_by_category(category)

    # Step 2: Use Gemini to pick relevant subcategories
    relevant_subcats = get_relevant_subcategories(category, query, combined_subcats)
    print(f"Gemini suggested subcategories: {relevant_subcats}")
    # Step 3: Filter data by relevant subcategories
    filtered_df = df_combined[df_combined['subcategory'].isin(relevant_subcats)].copy()

    # Optional: Budget filtering
    if budget:
        filtered_df['price'] = filtered_df['price'].replace({',': ''}, regex=True).astype(float)
        filtered_df = filtered_df[filtered_df['price'] <= budget]

    # Preprocess text fields
    filtered_df['cleaned_description'] = filtered_df['cleaned_description'].fillna('No description').astype(str)
    filtered_df['reviews'] = pd.to_numeric(filtered_df['reviews'], errors='coerce').fillna(0)
    filtered_df['rating'] = pd.to_numeric(filtered_df['rating'], errors='coerce').fillna(0)
    
    # Step 4: Encode query and rank products
    query_vec = encode(query)
    filtered_df['score'] = filtered_df['cleaned_description'].apply(lambda x: cosine_sim(encode(x), query_vec))

    # Normalize review count and rating
    max_reviews = filtered_df['reviews'].max() or 1
    max_rating = filtered_df['rating'].max() or 1
    filtered_df['normalized_reviews'] = filtered_df['reviews'] / max_reviews
    filtered_df['normalized_rating'] = filtered_df['rating'] / max_rating

    # Step 5: Combine scores with weights for final ranking
    filtered_df['final_score'] = (
        filtered_df['score'] * 0.5 +
        filtered_df['normalized_rating'] * 0.3 +
        filtered_df['normalized_reviews'] * 0.2
    )

    # Step 6: Select top products
    top_products = filtered_df.sort_values(by='final_score', ascending=False).head(top_k)

    # Select relevant details for response
    return top_products[['title', 'price', 'rating', 'reviews', 'final_score']].to_dict(orient='records')
