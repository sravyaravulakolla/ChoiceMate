import pandas as pd
import os
import google.generativeai as genai
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()
api_keys = [os.getenv("GEMINI_API_KEY1"), os.getenv("GEMINI_API_KEY2"), os.getenv("GEMINI_API_KEY3"),os.getenv("GEMINI_API_KEY4"),os.getenv("GEMINI_API_KEY5"),os.getenv("GEMINI_API_KEY6"),os.getenv("GEMINI_API_KEY7"),os.getenv("GEMINI_API_KEY8"),os.getenv("GEMINI_API_KEY9")]  # List of API keys

# Checkpoint CSV file
CHECKPOINT_FILE = 'checkpoint.csv'
RESULTS_FILE = 'processed_products.csv'

def call_gemini_cleaner_batch(products, api_key):
    """Call Gemini AI to clean and categorize a batch of 5 products."""
    genai.configure(api_key=api_key)  # Dynamically set API key

    # Prepare prompt for 5 products at once
    prompt = "You are a smart product data cleaner and categorizer for an e-commerce assistant.\n\n"
    for i, product in enumerate(products):
        prompt += f"Product {i+1}:\n"
        prompt += f"Title: {product['title']}\n"
        prompt += f"Description: {product['description']}\n\n"
    prompt += "Tasks:\n1. Create a cleaned 2-3 line description, combining title and description, keeping only important and relevant info that helps users decide about the product.\n"
    prompt += "2. Identify a subcategory (e.g., 'Screen Protector', 'Charger').\n"
    prompt += "Output in this JSON format:\n[{...}, {...}, ...]"

    model = genai.GenerativeModel("gemini-1.5-pro")
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()

        result = eval(response_text)  # Parse JSON response
        return result
    except Exception as e:
        print(f"Error with API key {api_key}: {e}")
        return None  # Return None to indicate failure

def load_checkpoint():
    """Load checkpoint (last processed product index) from CSV file."""
    if os.path.exists(CHECKPOINT_FILE):
        checkpoint_df = pd.read_csv(CHECKPOINT_FILE)
        return checkpoint_df.iloc[0]['last_processed_index'] if not checkpoint_df.empty else 0
    return 0  # If no checkpoint exists, start from the beginning

def save_checkpoint(index):
    """Save current processed index to checkpoint CSV file."""
    checkpoint_df = pd.DataFrame({'last_processed_index': [index]})
    checkpoint_df.to_csv(CHECKPOINT_FILE, index=False)

def preprocess_products(file_path):
    df = pd.read_csv(file_path)

    # Load last processed index from checkpoint CSV
    last_processed_index = load_checkpoint()

    api_key_index = 0  # Start with the first API key
    batch_size = 5

    while last_processed_index < len(df):
        # Get the next 5 products to process
        products_to_process = df.iloc[last_processed_index:last_processed_index + batch_size]

        print(f"Processing batch starting from product {last_processed_index + 1}")

        # Prepare list of product dictionaries for the current batch
        products = []
        for idx, row in products_to_process.iterrows():
            title = str(row['title'])
            description = str(row['description'])
            products.append({"title": title, "description": description})

        success = False

        while not success:  # Keep trying this batch until success
            result = call_gemini_cleaner_batch(products, api_keys[api_key_index])

            if result:
                cleaned_descriptions = [r.get('cleaned_description', '') for r in result]
                subcategories = [r.get('subcategory', '') for r in result]

                # Save results for this batch to CSV
                df_batch = products_to_process.copy()
                df_batch['cleaned_description'] = cleaned_descriptions
                df_batch['subcategory'] = subcategories

                # Append the batch to the CSV file
                if not os.path.exists(RESULTS_FILE):
                    df_batch.to_csv(RESULTS_FILE, index=False)
                else:
                    df_batch.to_csv(RESULTS_FILE, mode='a', header=False, index=False)

                # Update checkpoint after processing the batch
                last_processed_index += batch_size
                save_checkpoint(last_processed_index)

                print(f"Successfully processed batch ending at product {last_processed_index}")
                success = True  # Mark batch as completed

            else:
                print(f"Failed with API key index {api_key_index}, trying next key...")
                api_key_index = (api_key_index + 1) % len(api_keys)

                # If we tried all keys and none worked, wait before retrying
                if api_key_index == 0:
                    print("All API keys failed for current batch. Waiting 60 seconds before retrying...")
                    time.sleep(60)


    print("Processing completed and saved to processed_products.csv.")

if __name__ == "__main__":
    preprocess_products(r'C:\Users\Vaishnavi\4-2\MajorProject\ChoiceMate\choicemate-flask-api\data\flipkart_data.csv')  # Your original products CSV
