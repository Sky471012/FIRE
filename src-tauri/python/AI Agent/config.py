from dotenv import load_dotenv
import os

# Load .env file as fallback for development (only loads if env vars not already set)
load_dotenv()

# API keys are injected by Tauri when starting the server
# Environment variable takes precedence over .env file
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")