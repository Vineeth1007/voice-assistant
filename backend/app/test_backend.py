import requests

BASE = "http://localhost:8000"

# 1) health
print("health:", requests.get(f"{BASE}/health").json())

# 2) reply
r = requests.post(f"{BASE}/reply", json={"text": "hello from python"})
print("reply:", r.status_code, r.json())

# 3) transcribe (needs a file)
with open("test.webm", "rb") as f:
    r = requests.post(f"{BASE}/transcribe", files={"file": ("test.webm", f, "audio/webm")})
    print("transcribe:", r.status_code, r.json())
