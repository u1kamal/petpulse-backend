import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key found: {'Yes' if api_key else 'No'}")

if not api_key:
    print("Error: GEMINI_API_KEY is missing from .env")
    exit(1)

try:
    genai.configure(api_key=api_key)
    # Testing the model currently used in main.py
    model_name = 'gemini-2.0-flash' 
    print(f"Attempting to contact Gemini using {model_name}...")
    
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Reply with 'Working!' if you can read this.")
    
    print("Success! Gemini responded:")
    print(response.text)
except Exception as e:
    print(f"Error connecting to Gemini: {e}")
