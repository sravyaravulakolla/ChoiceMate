import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize the Gemini model
model = genai.GenerativeModel('gemini-1.5-pro-latest')

def extract_preferences(text):
    try:
        # Use Gemini to extract preferences
        response = model.generate_content(
            f"Extract product preferences (category, budget, features) as JSON from this query: {text}. Format: {{category: string, budget: string, features: list}}."
        )
        return response.text
    except Exception as e:
        print(f"Error with Gemini API: {e}")
        return None

# Example usage
if __name__ == "__main__":
    test_query = "I need a waterproof Bluetooth speaker under $100"
    preferences = extract_preferences(test_query)
    print("Extracted Preferences:", preferences)