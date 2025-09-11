from dotenv import load_dotenv
load_dotenv()
import os
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
print("OPENROUTER_API_KEY =", os.getenv("OPENROUTER_API_KEY"))
