"""
HomeQuest AI - Automated Dependencies Installer
Run this script:
    python requirements.py

Or use pip:
    pip install -r requirements.txt
"""
import sys
import subprocess

CORE_REQUIREMENTS = [
    "Django==6.1.3",
    "djangorestframework==3.18.3",
    "djangorestframework_simplejwt==5.5.1",
    "django-cors-headers==4.9.0",
    "psycopg==3.3.9",
    "psycopg-binary==3.3.9",
    "pillow==12.0.0",
    "PyJWT==2.15.1",
    "cryptography==50.0.2",
    "requests==2.34.2",
    "python-dotenv==1.2.4",
    "asgiref==3.13.0",
    "sqlparse==0.6.1",
]

def install_dependencies():
    print("==================================================")
    print(" HomeQuest AI: Installing Project Dependencies    ")
    print("==================================================")
    print(f"Using Python: {sys.executable}\n")

    cmd = [sys.executable, "-m", "pip", "install", *CORE_REQUIREMENTS]
    try:
        subprocess.check_call(cmd)
        print("\n[SUCCESS] All HomeQuest dependencies installed successfully!")
        print("You can now run: python manage.py migrate")
        print("                 python manage.py runserver")
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Installation failed with exit code {e.returncode}")
        sys.exit(e.returncode)

if __name__ == "__main__":
    install_dependencies()
