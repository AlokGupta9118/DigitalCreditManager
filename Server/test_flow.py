import requests
import time

BASE_URL = "http://localhost:8000"

def test_flow():
    # 1. Get a case
    cases = requests.get(f"{BASE_URL}/cases/").json()
    if not cases:
        print("No cases found")
        return
        
    case = cases[0]
    case_id = case["_id"]
    company_name = case.get("companyName", "Test Co")
    
    print(f"Testing for Case ID: {case_id}, Company: {company_name}")
    
    # 2. Run Research (sync)
    print("Running Research...")
    res = requests.post(f"{BASE_URL}/research/run?creditCaseId={case_id}&companyName={company_name}")
    print(res.json())
    time.sleep(2)
    
    # 3. Run Risk (sync)
    print("Running Risk Scoring...")
    res = requests.post(f"{BASE_URL}/risk/run/{case_id}")
    print(res.json())
    time.sleep(2)
    
    # 4. Run Recommendation (sync)
    print("Running Recommendation...")
    res = requests.post(f"{BASE_URL}/recommendation/run/{case_id}")
    print(res.json())
    time.sleep(2)
    
    # 5. Run CAM
    print("Generating CAM...")
    res = requests.post(f"{BASE_URL}/cam/generate/{case_id}?format=PDF")
    print(res.json())
    
if __name__ == "__main__":
    test_flow()
