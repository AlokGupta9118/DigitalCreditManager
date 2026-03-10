import requests
import json
import time

BASE_URL = "http://localhost:8000"

def get_status():
    cases = requests.get(f"{BASE_URL}/cases/").json()
    if not cases:
        print("No cases")
        return
    case_id = cases[0]["_id"]
    
    print("Checking research...")
    try:
        res = requests.get(f"{BASE_URL}/research/latest/{case_id}").json()
        print("Research Status:", res.get("status"))
        print("Overall Risk:", res.get("overallRisk"))
        if res.get("status") == "ERROR":
            print("ERROR IN RESEARCH:", res.get("rawResearch"))
        else:
            print("Length of rawResearch:", len(res.get("rawResearch", "")))
    except Exception as e:
        print("Research fetch failed:", e)

if __name__ == "__main__":
    get_status()
