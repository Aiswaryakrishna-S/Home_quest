# =====================================================================
# HOMEQUEST AI - KERALA REAL ESTATE SALE AGREEMENT GENERATOR
# =====================================================================

import datetime
from decimal import Decimal


def number_to_inr_words(amount):
    """Converts numeric Indian Rupee amounts into standard written words."""
    try:
        val = int(amount)
        if val >= 10000000:
            crores = val / 10000000
            return f"{crores:.2f} Crores Rupees"
        elif val >= 100000:
            lakhs = val / 100000
            return f"{lakhs:.2f} Lakhs Rupees"
        else:
            return f"{val:,} Rupees"
    except Exception:
        return f"{amount} Rupees"


def generate_sale_agreement_text(
    agreement_number: str,
    property_obj,
    buyer_name: str,
    buyer_email: str,
    buyer_phone: str,
    buyer_address: str,
    agreed_price: Decimal,
    token_amount: Decimal,
    balance_amount: Decimal,
    stamp_duty: Decimal,
    registration_fee: Decimal,
    total_cost: Decimal,
    payment_method: str,
    transaction_id: str,
    settlement_deadline_str: str = None
) -> str:
    """
    Generates an official, legally structured Real Estate Purchase & Sale
    Agreement document for Kerala property transactions under the
    Transfer of Property Act and RERA guidelines.
    """
    now = datetime.datetime.now()
    exec_date = now.strftime('%d %B, %Y')
    exec_place = property_obj.city.title() if property_obj.city else "Kerala"

    seller = property_obj.seller
    seller_name = "Property Owner"
    seller_email = "owner@homequest.ai"
    seller_phone = "+91 (Verified Seller)"
    seller_address = property_obj.address or property_obj.city or "Kerala, India"

    if seller:
        full = f"{seller.first_name} {seller.last_name}".strip()
        seller_name = full or seller.username
        if seller.email:
            seller_email = seller.email
        if getattr(seller, 'phone_number', None):
            seller_phone = seller.phone_number

    if not settlement_deadline_str:
        deadline = now + datetime.timedelta(days=60)
        settlement_deadline_str = deadline.strftime('%d %B, %Y')

    amount_words = number_to_inr_words(agreed_price)
    token_words = number_to_inr_words(token_amount)
    balance_words = number_to_inr_words(balance_amount)

    coords_str = ""
    if property_obj.latitude and property_obj.longitude:
        coords_str = f"GPS Coordinates: {property_obj.latitude}° N, {property_obj.longitude}° E"

    agreement_doc = f"""================================================================================
                    AGREEMENT FOR SALE OF IMMOVABLE PROPERTY
                   Executed in the State of Kerala, Republic of India
================================================================================

DOCUMENT REFERENCE NO: {agreement_number}
DATE OF EXECUTION     : {exec_date}
PLACE OF EXECUTION    : {exec_place}, Kerala

--------------------------------------------------------------------------------
1. PARTIES TO THE AGREEMENT
--------------------------------------------------------------------------------

THIS AGREEMENT FOR SALE is entered into on this {exec_date} by and between:

A. THE VENDOR (First Party / Seller):
   Name        : {seller_name}
   Email       : {seller_email}
   Phone       : {seller_phone}
   Address     : {seller_address}
   (Hereinafter referred to as the "VENDOR / SELLER", which expression shall unless 
    repugnant to the context include legal heirs, executors, administrators and assigns)

   AND

B. THE PURCHASER (Second Party / Buyer):
   Name        : {buyer_name}
   Email       : {buyer_email}
   Phone       : {buyer_phone}
   Address     : {buyer_address or 'Kerala, India'}
   (Hereinafter referred to as the "PURCHASER / BUYER", which expression shall unless 
    repugnant to the context include legal heirs, executors, administrators and assigns)

--------------------------------------------------------------------------------
2. SCHEDULE OF IMMOVABLE PROPERTY (SUBJECT MATTER)
--------------------------------------------------------------------------------

All that piece and parcel of immovable real-estate property situated in Kerala:
   • Property Title      : {property_obj.title}
   • Category / Type     : {property_obj.property_type}
   • Extent / Area       : {property_obj.area_sqft} Square Feet
   • Municipal / Address : {property_obj.address}, {property_obj.city}, Kerala
   • Postal PIN Code     : {property_obj.zip_code or 'Kerala Regional PIN'}
   • Geolocation         : {coords_str or 'Mapped via HomeQuest AI GIS'}

--------------------------------------------------------------------------------
3. FINANCIAL CONSIDERATION & STATUTORY CHARGES BREAKDOWN
--------------------------------------------------------------------------------

WHEREAS the Vendor has agreed to sell and the Purchaser has agreed to purchase 
the Schedule Property free from all encumbrances, charges, liens and attachments:

   A. Total Agreed Consideration   : ₹{agreed_price:,.2f} ({amount_words})
   B. Advance / Token Amount Paid  : ₹{token_amount:,.2f} ({token_words})
   C. Mode of Advance Payment      : {payment_method}
   D. Bank / Transaction Reference : {transaction_id}
   E. Balance Consideration Due    : ₹{balance_amount:,.2f} ({balance_words})
   F. Final Settlement Deadline    : On or before {settlement_deadline_str}

STATUTORY KERALA REGISTRATION ESTIMATES:
   • Kerala Stamp Duty (8%)        : ₹{stamp_duty:,.2f}
   • Sub-Registrar Fee (2%)        : ₹{registration_fee:,.2f}
   • Total Estimated Outlay        : ₹{total_cost:,.2f}

--------------------------------------------------------------------------------
4. TERMS, COVENANTS AND STIPULATIONS
--------------------------------------------------------------------------------

1. PAYMENT OF BALANCE CONSIDERATION:
   The Purchaser covenants to pay the balance consideration of ₹{balance_amount:,.2f} 
   to the Vendor on or before {settlement_deadline_str}, at the time of final execution 
   and registration of the Sale Deed before the jurisdictional Sub-Registrar.

2. CLEAR TITLE & ENCUMBRANCE WARRANTY:
   The Vendor guarantees and assures the Purchaser that the Schedule Property 
   possesses clear, marketable title, free from any government dues, land taxes, 
   mortgages, attachments, or court litigations.

3. PHYSICAL VACANT POSSESSION:
   The physical, peaceful and vacant possession of the Schedule Property shall be 
   delivered to the Purchaser simultaneously with the registration of the absolute 
   Sale Deed upon receipt of the total consideration.

4. EXPENSES OF CONVEYANCE:
   The Purchaser shall bear the cost of Kerala Stamp Duty, Sub-Registrar registration 
   fees, and conveyance documentation fees.

5. DEFAULT AND REMEDIES:
   Should the Vendor fail to complete the conveyance despite the Purchaser being ready 
   and willing, the Purchaser shall be entitled to specific performance of this 
   agreement through the competent Civil Court. Should the Purchaser default, the 
   Vendor may rescind this agreement upon due written notice.

6. JURISDICTION:
   This Agreement shall be governed by the laws of India. Courts having jurisdiction 
   over {exec_place}, Kerala shall have exclusive jurisdiction over disputes.

--------------------------------------------------------------------------------
5. EXECUTION & DIGITAL VERIFICATION
--------------------------------------------------------------------------------

IN WITNESS WHEREOF the Vendor and Purchaser have set their hands to this Agreement 
for Sale through the HomeQuest AI Verified Escrow & Documentation Engine:

[DIGITALLY VERIFIED VIA HOMEQUEST AI]

VENDOR / SELLER:
Name     : {seller_name}
Timestamp: {exec_date} (System Verified)

PURCHASER / BUYER:
Name     : {buyer_name}
Contact  : {buyer_email} • {buyer_phone}
Timestamp: {exec_date} (Token Payment Confirmed)

================================================================================
                    END OF SALE AGREEMENT DOCUMENT
================================================================================
"""
    return agreement_doc.strip()
