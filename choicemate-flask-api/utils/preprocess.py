import pandas as pd
import re
import string
from bs4 import BeautifulSoup

stopwords = [
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 
    'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 
    'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 
    'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 
    'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 
    'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 
    's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 
    've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 
    'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
]
def clean_text(text):
    text = str(text) if text else ""
    text = BeautifulSoup(text, "html.parser").get_text()
    text = re.sub(f"[{string.punctuation}]", "", text.lower())
    return " ".join([word for word in text.split() if word not in stopwords])

def load_and_prepare_data():
    df_amazon = pd.read_csv('data/amazon_data.csv')
    df_flipkart = pd.read_csv('data/flipkart_data.csv')

    df_amazon['source'] = 'Amazon'
    df_flipkart['source'] = 'Flipkart'

    df = pd.concat([df_amazon, df_flipkart], ignore_index=True)
    df['price'] = df['price'].replace({'₹': '', ',': ''}, regex=True).astype(float)
    df['rating'] = df['rating'].apply(lambda x: float(re.findall(r'\d+\.\d+', str(x))[0]) if re.findall(r'\d+\.\d+', str(x)) else 0)

    df['cleaned_category'] = df['category'].apply(clean_text)
    df['cleaned_title'] = df['title'].apply(clean_text)
    df['cleaned_description'] = df['description'].apply(clean_text)
    return df

def match_category(query, categories):
    for cat in categories:
        if re.search(cat.lower(), query.lower()):
            return cat
    return None

def filter_products_by_query(df, query):
    query_category = match_category(query, df['category'].unique())
    if not query_category:
        return None, None

    filtered_df = df[df['category'] == query_category].copy()
    price_matches = re.findall(r'under\s*(\d+)', query.lower())
    if price_matches:
        max_price = float(price_matches[0])
        filtered_df = filtered_df[filtered_df['price'] <= max_price]

    if filtered_df.empty:
        return None, None

    top_candidates = filtered_df.sort_values(by='rating', ascending=False).head(50)
    return top_candidates, query_category
