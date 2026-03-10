import requests
import time

BASE_URL = "http://localhost:8000"

def test_rest():
    cases = requests.get(f"{BASE_URL}/cases/").json()
    case_id = cases[0]["_id"]
    
    print("Running Risk...")
    res = requests.post(f"{BASE_URL}/risk/run/{case_id}")
    print(res.status_code, res.json())
    time.sleep(5) # wait for risk to finish
    
    print("Running Recommendation...")
    res = requests.post(f"{BASE_URL}/recommendation/run/{case_id}")
    print(res.status_code, res.json())
    
    print("Generating CAM...")
    res = requests.post(f"{BASE_URL}/cam/generate/{case_id}?format=PDF")
    print(res.status_code, res.json())

if __name__ == "__main__":
    test_rest()
