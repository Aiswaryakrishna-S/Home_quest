import json
import sys
import requests

BASE_URL = "http://127.0.0.1:8000/api/auth"

def register_user(payload):
    url = f"{BASE_URL}/register/"
    resp = requests.post(url, json=payload)
    print("[REGISTER] Status:", resp.status_code)
    try:
        data = resp.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print(resp.text)
        return None
    return data

def verify_email(email, otp):
    url = f"{BASE_URL}/verify-email/"
    resp = requests.post(url, json={"email": email, "otp": otp})
    print("[VERIFY EMAIL] Status:", resp.status_code)
    try:
        data = resp.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print(resp.text)
        return None
    return data

def resend_otp(email):
    url = f"{BASE_URL}/resend-otp/"
    resp = requests.post(url, json={"email": email})
    print("[RESEND OTP] Status:", resp.status_code)
    try:
        data = resp.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print(resp.text)
        return None
    return data

if __name__ == "__main__":
    # Example payload – replace with your own data if needed
    user_payload = {
        "username": "midhun",
        "email": "midhunchandran230@gmail.com",
        "password": "SecurePassword123!",
        "first_name": "Midhun",
        "last_name": "Chandran",
        "phone_number": "+919876543210",
        "role": "BUYER",
    }

    register_response = register_user(user_payload)
    if not register_response:
        sys.exit(1)

    # The OTP is emailed – for demo you can manually set it here:
    otp = input("Enter the 6‑digit OTP received via email: ").strip()
    if otp:
        verify_email(user_payload["email"], otp)
    else:
        print("Skipping verification. You can call resend_otp() manually if needed.")
        # Example of resend (uncomment if you need it)
        # resend_otp(user_payload["email"])