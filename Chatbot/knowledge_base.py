# =====================================================================
# HOMEQUEST AI - PLATFORM KNOWLEDGE BASE FOR RAG RETRIEVAL
# Detailed guides on usability, features, ML pricing, maps, and accounts
# =====================================================================

PLATFORM_DOCUMENTS = [
    {
        "id": "doc_general_overview",
        "topic": "about_homequest",
        "title": "About HomeQuest AI Platform",
        "content": (
            "HomeQuest AI is an intelligent real estate marketplace tailored specifically for Kerala's 14 districts. "
            "It connects property owners/sellers with prospective buyers and tenants. Key innovations include "
            "interactive Leaflet GPS map exploration with 'Near Me' proximity search, an AI/ML Kerala Price Valuation "
            "Advisor based on NH 66 and IT hub corridors, real-time client enquiry tracking, and instant role-based dashboards."
        )
    },
    {
        "id": "doc_registration_login",
        "topic": "account_and_auth",
        "title": "Account Registration and 6-Digit OTP Verification",
        "content": (
            "To register on HomeQuest AI:\n"
            "1. Click 'Sign Up' in the top navbar.\n"
            "2. Fill in your username, email address, password, name, phone number, and select your Role (BUYER or SELLER).\n"
            "3. Click 'Send OTP to Email'. A 6-digit verification code will be sent to your Gmail/email.\n"
            "4. Enter the 6-digit OTP code within 10 minutes to verify your identity and activate your account.\n"
            "5. If you registered as a SELLER, you will automatically be directed to the Owner Dashboard upon login."
        )
    },
    {
        "id": "doc_forgot_password",
        "topic": "account_recovery",
        "title": "How to Reset a Forgotten Password",
        "content": (
            "If you forgot your password:\n"
            "1. Go to the Sign In page and click the 'Forgot Password?' link next to the password input.\n"
            "2. Enter your registered email address and click 'Send 6-Digit Reset Code'.\n"
            "3. Check your email inbox for the 6-digit reset code.\n"
            "4. Enter the 6-digit OTP, type your new strong password (minimum 8 characters), confirm it, and click 'Reset Password & Sign In'.\n"
            "5. Your password is now updated and you can immediately log in."
        )
    },
    {
        "id": "doc_owner_dashboard",
        "topic": "owner_dashboard",
        "title": "Owner and Seller Dashboard Overview",
        "content": (
            "The Owner Dashboard is a command center for sellers and property managers. It includes:\n"
            "- Portfolio Stats: Active listings count, total enquiries received, pending client queries, and total portfolio valuation in ₹ INR.\n"
            "- My Properties: View, search, edit, or delete any of your published listings.\n"
            "- Client Enquiries: Review incoming buyer messages, contact details, and update status from PENDING to CONTACTED or RESOLVED.\n"
            "- + Add Property: Complete form with AI Price Valuation and Leaflet GPS location picker."
        )
    },
    {
        "id": "doc_listing_property",
        "topic": "listing_properties",
        "title": "How Owners List a New Property with GPS",
        "content": (
            "To list a new property on HomeQuest AI:\n"
            "1. Log in to your SELLER account and navigate to the Owner Dashboard.\n"
            "2. Click '+ Add Property' or '+ Add New Property'.\n"
            "3. Enter Title, select Property Type (Building, Apartment, Rental, Plot, or Real Estate).\n"
            "4. Enter Area in Square Feet, Street Address, City (e.g., Kakkanad, Kochi, Kozhikode, Trivandrum).\n"
            "5. Click '📍 Auto-Detect GPS' to fetch device coordinates, or enter Latitude and Longitude for Leaflet mapping.\n"
            "6. Use the '🧠 AI Price & Increment Advisor' to get a recommended market price and area boost %.\n"
            "7. Upload high-quality property photos, enter a description, and click 'Publish Property'."
        )
    },
    {
        "id": "doc_ml_pricing",
        "topic": "ml_price_advisor",
        "title": "How the AI Kerala Price & Increment Engine Works",
        "content": (
            "HomeQuest AI features a machine learning valuation model (Scikit-Learn Random Forest, R²=0.9818) "
            "calibrated for Kerala real estate:\n"
            "- NH 66 6-Lane Expansion Corridor: Calculates exact distance to the expanding NH 66 highway. "
            "Properties within < 1.0 km receive a +24.5% value boost; 1.0-2.5 km receive a +16.0% boost.\n"
            "- IT Hub Proximity: Calculates distance to Infopark/SmartCity (Kakkanad), Technopark (Kazhakkoottam), "
            "and Cyberpark (Kozhikode). Properties within 3.5 km gain up to a +15.0% price boost due to strong rental demand.\n"
            "- Market Verdict: Evaluates if an owner's price is Underpriced (advises increasing rate), Fairly Priced, "
            "or Overpriced compared to regional Kerala averages per square foot.\n"
            "- Owners can click '✨ Apply Suggested Price' to set the AI rate in one click."
        )
    },
    {
        "id": "doc_near_me_maps",
        "topic": "map_and_search",
        "title": "How to Search Properties with 'Near Me' and Leaflet Maps",
        "content": (
            "HomeQuest AI offers dual geolocation search:\n"
            "1. 'Near Me' Button: Click '📍 Near Me' in the navbar or hero search bar. The browser requests your GPS location "
            "and automatically finds listings sorted by closest distance to you in kilometers.\n"
            "2. Small Hero Map View: The interactive Leaflet widget on the right side of the Home page plots available properties "
            "with interactive price bubbles. Clicking a pin displays title, city, and price.\n"
            "3. Radius Filter: Search within 5 km, 10 km, 25 km, or 50 km radius of any coordinate."
        )
    },
    {
        "id": "doc_enquiry_contact",
        "topic": "enquiries",
        "title": "How Buyers Submit Enquiries to Property Owners",
        "content": (
            "When a buyer is interested in a property:\n"
            "1. Click on the property card or details button.\n"
            "2. Fill in the Enquiry form with your Name, Email, Phone Number, and Message/Questions.\n"
            "3. Click 'Send Enquiry'. The property owner immediately receives the lead on their Owner Dashboard.\n"
            "4. The owner can contact the buyer by phone or email and update the inquiry status to CONTACTED or RESOLVED."
        )
    }
]
