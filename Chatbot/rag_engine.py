# =====================================================================
# HOMEQUEST AI - HYBRID RAG ENGINE (RETRIEVAL-AUGMENTED GENERATION)
# Combines:
# 1. Platform Usability & Features Knowledge Base
# 2. Live Dynamic Property Database Search & Intent Matching
# 3. Google Gemini Generative AI (with fallback response generator)
# =====================================================================

import re
import json
import requests
from django.conf import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .knowledge_base import PLATFORM_DOCUMENTS
from Propertys.models import Property


class HomeQuestRAG:
    """
    RAG engine orchestrating:
    - Semantic document retrieval over platform usability guides
    - Parameterized database querying over active real estate listings
    - Prompt augmentation and Gemini LLM inference
    """

    def __init__(self):
        self.docs = PLATFORM_DOCUMENTS
        self.doc_texts = [f"{d['title']}. {d['content']}" for d in self.docs]
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.doc_vectors = self.vectorizer.fit_transform(self.doc_texts)

    def retrieve_platform_docs(self, query: str, top_k: int = 2):
        """Finds top_k most relevant platform documentation chunks."""
        query_vec = self.vectorizer.transform([query])
        sims = cosine_similarity(query_vec, self.doc_vectors).flatten()
        top_indices = sims.argsort()[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if sims[idx] > 0.08:  # Minimum similarity threshold
                results.append(self.docs[idx])
        return results

    def extract_property_filters(self, query: str):
        """Extracts location, budget, and property type from natural language query."""
        q_lower = query.lower()
        filters = {}

        # 1. Location / Kerala City Match
        kerala_cities = [
            'kochi', 'cochin', 'kakkanad', 'edappally', 'aluva', 'vyttila',
            'trivandrum', 'thiruvananthapuram', 'kazhakkoottam', 'kowdiar',
            'kozhikode', 'calicut', 'thrissur', 'kottayam', 'kollam',
            'alappuzha', 'palakkad', 'malappuram', 'kannur', 'kasaragod',
            'idukki', 'wayanad', 'pathanamthitta'
        ]
        for city in kerala_cities:
            if city in q_lower:
                filters['city'] = city
                break

        # 2. Property Type Match
        if 'apartment' in q_lower or 'flat' in q_lower:
            filters['property_type'] = 'APARTMENT'
        elif 'villa' in q_lower or 'house' in q_lower or 'home' in q_lower or 'building' in q_lower:
            filters['property_type'] = 'BUILDING'
        elif 'plot' in q_lower or 'land' in q_lower or 'cent' in q_lower:
            filters['property_type'] = 'PLOT'
        elif 'rent' in q_lower or 'rental' in q_lower or 'lease' in q_lower:
            filters['property_type'] = 'RENTAL'

        # 3. Budget / Max Price Match
        # Match 'under 80 lakhs', 'below 1 cr', 'under 50l', 'budget 7000000'
        lakh_match = re.search(r'(?:under|below|max|around|within)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)', q_lower)
        cr_match = re.search(r'(?:under|below|max|around|within)?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)', q_lower)
        num_match = re.search(r'(?:under|below|within)\s*(?:₹|rs\.?|inr)?\s*(\d{5,9})', q_lower)

        if lakh_match:
            val = float(lakh_match.group(1))
            filters['max_price'] = val * 100000
        elif cr_match:
            val = float(cr_match.group(1))
            filters['max_price'] = val * 10000000
        elif num_match:
            filters['max_price'] = float(num_match.group(1))

        return filters

    def is_greeting(self, query: str) -> bool:
        """Detects whether the input is a simple greeting or general welcome query."""
        q_clean = re.sub(r'[^\w\s]', '', query.strip().lower())
        greeting_words = {'hi', 'hello', 'hey', 'namaskaram', 'hola', 'sup', 'good morning', 'good evening', 'good afternoon'}
        if q_clean in greeting_words:
            return True
        words = q_clean.split()
        if len(words) <= 3 and any(w in greeting_words for w in words):
            return True
        if q_clean in {'who are you', 'what can you do', 'what is this', 'help'}:
            return True
        return False

    def has_property_intent(self, query: str, filters: dict) -> bool:
        """Determines whether the user is actively searching or asking about property listings."""
        if filters.get('city') or filters.get('property_type') or filters.get('max_price'):
            return True
        q = query.lower()
        search_words = [
            'find', 'search', 'show', 'looking for', 'want to buy', 'want to rent',
            'villa', 'villas', 'apartment', 'apartments', 'flat', 'flats',
            'house', 'houses', 'plot', 'plots', 'home', 'homes', 'bhk',
            'property', 'properties', 'properies', 'propertys', 'proprty', 'listing', 'listings', 'real estate'
        ]
        return any(w in q for w in search_words)

    def search_properties(self, query: str, limit: int = 4):
        """Queries the live database for matching properties only if property intent exists."""
        filters = self.extract_property_filters(query)

        # Do not query properties if user didn't ask for listings (e.g., greetings or platform help)
        if not self.has_property_intent(query, filters):
            return [], filters

        try:
            qs = Property.objects.all().select_related('seller')

            if 'city' in filters:
                qs = qs.filter(city__icontains=filters['city'])
            if 'property_type' in filters:
                qs = qs.filter(property_type=filters['property_type'])
            if 'max_price' in filters:
                qs = qs.filter(price__lte=filters['max_price'])

            # Fallback if specific filters yielded no results: search title/description
            if not qs.exists() and len(query.split()) > 1:
                words = [w for w in query.split() if len(w) > 3]
                for w in words[:3]:
                    candidate = Property.objects.filter(title__icontains=w) | Property.objects.filter(city__icontains=w)
                    if candidate.exists():
                        qs = candidate
                        break

            results = list(qs[:limit])
            return results, filters
        except Exception as e:
            print(f"Warning: Property DB query failed ({e}). Returning empty list.")
            return [], filters

    def format_property_card(self, prop):
        """Formats a property into a concise card dictionary for frontend rendering."""
        return {
            'id': prop.id,
            'title': prop.title,
            'city': prop.city,
            'price': float(prop.price),
            'formatted_price': prop.formatted_price,
            'property_type': prop.property_type,
            'area_sqft': prop.area_sqft,
            'address': prop.address,
            'image': prop.image.url if prop.image else None,
            'latitude': float(prop.latitude) if prop.latitude else None,
            'longitude': float(prop.longitude) if prop.longitude else None,
        }

    def generate_gemini_reply(self, prompt: str):
        """Sends the augmented prompt to Google Gemini API using supported models."""
        api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
        if not api_key:
            return None

        # Supported models on modern Gemini v1beta endpoint
        models_to_try = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite']
        headers = {'Content-Type': 'application/json'}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800,
            }
        }

        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=12)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get('candidates', [])
                    if candidates and 'content' in candidates[0]:
                        parts = candidates[0]['content'].get('parts', [])
                        if parts and 'text' in parts[0]:
                            return parts[0]['text'].strip()
                else:
                    print(f"Gemini model {model_name} returned status {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                print(f"Gemini API request failed for {model_name}: {e}")

        return None

    def query(self, user_message: str, chat_history=None):
        """
        Main RAG pipeline:
        1. Classifies intent (greeting, platform help, property search)
        2. Retrieves relevant docs or property listings
        3. Constructs augmented prompt and generates reply via Gemini or structured fallback
        """
        user_message_clean = user_message.strip()
        is_greet = self.is_greeting(user_message_clean)
        filters = self.extract_property_filters(user_message_clean)
        is_prop_search = self.has_property_intent(user_message_clean, filters)

        if is_greet:
            matched_docs = []
            matched_props = []
            applied_filters = {}
        elif is_prop_search:
            # User wants properties -> only search properties, don't confuse with usability docs
            matched_docs = []
            matched_props, applied_filters = self.search_properties(user_message_clean, limit=4)
        else:
            # User asking about platform features, help, or guidelines
            matched_docs = self.retrieve_platform_docs(user_message_clean, top_k=2)
            matched_props = []
            applied_filters = {}

        # Build Context String
        context_parts = []

        if matched_docs:
            context_parts.append("### PLATFORM USABILITY GUIDES:")
            for d in matched_docs:
                context_parts.append(f"[{d['title']}]: {d['content']}")

        if matched_props:
            context_parts.append("### CURRENT REAL ESTATE LISTINGS IN DATABASE:")
            for p in matched_props:
                context_parts.append(
                    f"- Listing ID {p.id}: {p.title} in {p.city}. Price: {p.formatted_price}. "
                    f"Type: {p.property_type}. Area: {p.area_sqft} sqft. Address: {p.address}."
                )
        elif applied_filters.get('city') or applied_filters.get('max_price'):
            context_parts.append(
                "### LISTINGS STATUS: No exact properties matched the user's criteria in our current database. "
                "Politely inform the user and suggest expanding their search radius or budget."
            )

        context_str = "\n".join(context_parts)

        # Augmented Prompt based on intent
        if is_greet:
            prompt = f"""
You are 'QuestBot', the friendly AI Assistant for HomeQuest Real Estate (Kerala, India).
The user just greeted you: "{user_message_clean}".

INSTRUCTIONS:
1. Greet the user warmly with a welcoming tone (e.g., Namaskaram / Welcome).
2. Introduce yourself as QuestBot and briefly highlight what you can do:
   - 🔍 Search properties across Kerala (villas, flats, plots by budget and district)
   - 🛣️ Explain how our Kerala ML Price Advisor calculates NH 66 and IT hub price increments
   - 🏡 Guide property owners on listing homes and auto-detecting Leaflet GPS coordinates
   - 🔑 Assist with account signup, OTP verification, and password resets
3. Do NOT invent or list random properties in a greeting.
4. Keep it concise, friendly, and formatted with clean bullet points.
"""
        else:
            prompt = f"""
You are 'QuestBot', the expert AI Assistant for HomeQuest Real Estate (Kerala, India).
Answer the user's question accurately using the knowledge context below.

KNOWLEDGE CONTEXT:
{context_str}

USER QUERY:
{user_message_clean}

INSTRUCTIONS:
1. If the user is searching for properties:
   - Highlight the matched listings with their title, city, and price.
   - Mention key perks (e.g., proximity to NH 66, Infopark/Technopark, or space).
2. If the user asks how to use the site (e.g. how to list a property, reset password, use ML pricing):
   - Provide clear, numbered step-by-step instructions from the context.
3. If no properties were found matching their exact criteria, inform them gently.
4. Keep the tone friendly, professional, and knowledgeable about Kerala real estate.
5. Format with bold keywords and bullet points.
"""

        # Try Gemini LLM first
        ai_reply = self.generate_gemini_reply(prompt)

        # Fallback response generator if Gemini key is missing or offline
        if not ai_reply:
            ai_reply = self._generate_structured_fallback(
                user_message_clean, matched_docs, matched_props, applied_filters
            )

        # Format property cards for frontend (only when properties were genuinely matched)
        property_cards = [self.format_property_card(p) for p in matched_props]

        # Determine source type
        if is_greet:
            source_type = 'greeting'
        elif matched_props or applied_filters:
            source_type = 'property_search'
        else:
            source_type = 'platform_help'

        return {
            'reply': ai_reply,
            'suggested_properties': property_cards,
            'source_type': source_type,
            'applied_filters': applied_filters,
        }

    def generate_ai_inquiry(self, property_obj, buyer_name: str, buyer_email: str, buyer_phone: str, intent_tone: str = 'ready_to_buy', user_request: str = ''):
        """
        Drafts a personalized AI buyer inquiry / express interest message:
        - Reviews the property characteristics (title, city, address, price, area, type)
        - Highlights who is sending (buyer identity, contact details)
        - Incorporates the user's specific request or purchase motivation
        - Adapts according to the selected intent tone ('ready_to_buy', 'professional', 'site_visit', 'negotiation')
        """
        owner_name = "Property Owner"
        if property_obj.seller:
            full = f"{property_obj.seller.first_name} {property_obj.seller.last_name}".strip()
            owner_name = full or property_obj.seller.username

        contact_parts = []
        if buyer_phone:
            contact_parts.append(f"phone ({buyer_phone})")
        if buyer_email:
            contact_parts.append(f"email ({buyer_email})")
        contact_str = " or ".join(contact_parts) if contact_parts else "my provided contact details"

        tone_prompts = {
            'ready_to_buy': "Express immediate purchase intent, serious readiness, pre-arranged financing, and ask to finalize preliminary terms or schedule an urgent inspection.",
            'professional': "Polite, formal inquiry requesting legal title documents, Encumbrance Certificate (EC), verified approvals, and setting up an introductory discussion.",
            'site_visit': "Directly request an in-person site inspection/walkthrough this week to assess property road access, neighborhood, and physical condition.",
            'negotiation': "Show keen interest while courteously inquiring about price flexibility, potential cash-discount or milestone payment terms for immediate closing.",
        }
        tone_desc = tone_prompts.get(intent_tone, tone_prompts['ready_to_buy'])

        request_context = f"\nSpecific Buyer Request / Motivation:\n\"{user_request}\"\nEnsure the message specifically reflects this requirement/motivation." if user_request else ""

        prompt = f"""
You are the AI Assistant for HomeQuest AI in Kerala.
Draft a concise, professional, and convincing buyer inquiry message from a prospective buyer to a property owner.

Property Details:
- Title: {property_obj.title}
- Property Type: {property_obj.property_type}
- Listed Price: {property_obj.formatted_price}
- Location: {property_obj.city}, Kerala ({property_obj.address})
- Area: {property_obj.area_sqft} sq.ft.
- Seller / Owner: {owner_name}

Buyer Information (Sender):
- Name: {buyer_name}
- Email: {buyer_email}
- Phone: {buyer_phone}
{request_context}

Inquiry Goal / Tone:
{tone_desc}

Guidelines:
1. Write in the first person as the buyer ({buyer_name}) addressing {owner_name}.
2. Mention the specific property title and listed price ({property_obj.formatted_price}).
3. Clearly state that {buyer_name} is sending this inquiry and provide their callback details ({contact_str}).
4. If a specific buyer request was provided, weave that requirement into the explanation naturally.
5. Keep the message between 3 to 5 sentences.
6. Do NOT include markdown headers, bold tags, or placeholder brackets like '[Your Name]'. Output only the pure message text ready to send.
"""

        gemini_reply = self.generate_gemini_reply(prompt)
        if gemini_reply and len(gemini_reply.strip()) > 30:
            cleaned_message = gemini_reply.strip().replace('"', '')
            return {
                'message': cleaned_message,
                'summary': f"AI-reviewed purchase inquiry for {property_obj.title} ({property_obj.formatted_price})",
                'is_ai_generated': True,
            }

        req_note = f" In reference to my requirement: {user_request}." if user_request else ""

        # Deterministic fallback templates tailored for Kerala real estate
        fallbacks = {
            'ready_to_buy': (
                f"Hello {owner_name}, my name is {buyer_name}. I am actively in the market to buy and have a serious purchase interest in your property \"{property_obj.title}\" in {property_obj.city} listed at {property_obj.formatted_price}.{req_note} My financing is organized, and I am prepared to move forward promptly. Please contact me via {contact_str} so we can arrange an inspection and discuss next steps."
            ),
            'professional': (
                f"Dear {owner_name}, my name is {buyer_name}. I am writing to express my interest in your property \"{property_obj.title}\" located in {property_obj.city} ({property_obj.formatted_price}).{req_note} The {property_obj.area_sqft} sq.ft {property_obj.property_type.lower()} closely matches my investment criteria. Could you please share the title deed documentation and current status? I can be reached at {contact_str}."
            ),
            'site_visit': (
                f"Dear {owner_name}, I am {buyer_name} and I came across your listing for \"{property_obj.title}\" in {property_obj.city} ({property_obj.formatted_price}).{req_note} The location and specifications align with my requirements. I would like to schedule an in-person site visit this week to inspect the property and neighborhood. Kindly reach out via {contact_str} to coordinate a suitable time."
            ),
            'negotiation': (
                f"Hello {owner_name}, I am {buyer_name}. I am keenly interested in purchasing \"{property_obj.title}\" in {property_obj.city}.{req_note} Having reviewed current area valuations and your listed price of {property_obj.formatted_price}, I would like to know if there is room for price discussion for an immediate buyer. Please connect with me via {contact_str} to discuss further."
            )
        }

        fallback_msg = fallbacks.get(intent_tone, fallbacks['ready_to_buy'])
        return {
            'message': fallback_msg,
            'summary': f"Reviewed purchase inquiry for {property_obj.title}",
            'is_ai_generated': False,
        }

    def _generate_structured_fallback(self, query, docs, props, filters):
        """Intelligent structured response generator when LLM API is unavailable."""
        q_lower = query.lower()

        # 1. Greetings First
        if self.is_greeting(query):
            return (
                "👋 **Hello and Namaskaram!** I am **QuestBot**, your AI assistant for HomeQuest Real Estate.\n\n"
                "I'm here to help you navigate real estate in Kerala! You can ask me:\n"
                "• 🔍 **Find Properties**: e.g., *'Find 3-BHK villas in Kakkanad under 80 lakhs'*\n"
                "• 🛣️ **Kerala ML Price Advisor**: *'How does the NH 66 highway boost work?'*\n"
                "• 🏡 **Seller & Owner Guides**: *'How do I list my property with GPS?'*\n"
                "• 🔑 **Account Security**: *'How do I reset my password?'*\n\n"
                "How can I assist you today?"
            )

        # 2. Property Recommendation response (if properties were retrieved)
        if props:
            first_p = props[0]
            count = len(props)
            loc_str = f" in {first_p.city}" if first_p.city else ""
            reply = (
                f"I found **{count} matching propert{'ies' if count > 1 else 'y'}**{loc_str} "
                f"matching your requirements! Here are the top recommendations:\n\n"
            )
            for p in props:
                reply += (
                    f"🏡 **{p.title}**\n"
                    f"📍 Location: {p.city}{', ' + p.address if p.address else ''}\n"
                    f"💰 Price: **{p.formatted_price}** ({p.area_sqft} sq.ft)\n"
                    f"🏷️ Type: {p.property_type}\n\n"
                )
            reply += "You can click on any property card below to view GPS coordinates and submit an inquiry directly to the seller!"
            return reply

        # 3. Property Search intent but 0 properties currently found in DB
        if self.has_property_intent(query, filters):
            city_name = filters.get('city', '').capitalize()
            loc_label = f" in **{city_name}**" if city_name else ""
            return (
                f"🔍 I searched our database for properties{loc_label}, but there are currently no active listings "
                f"matching your exact query.\n\n"
                f"💡 **Helpful Recommendations:**\n"
                f"• Try exploring nearby districts in Kerala such as **Kochi**, **Thrissur**, or **Malappuram**.\n"
                f"• Check back soon, as verified owners frequently publish new listings on HomeQuest AI.\n"
                f"• If you are a property owner in {city_name or 'Kerala'}, you can easily list your home through the **Owner Dashboard**!"
            )

        # 4. Platform Usability Document response (for how-to and help queries)
        if docs:
            top_doc = docs[0]
            return (
                f"### {top_doc['title']}\n\n"
                f"{top_doc['content']}\n\n"
                f"*Feel free to ask if you need further assistance with this feature!*"
            )

        return (
            "I'm here to help you explore properties across Kerala and guide you through HomeQuest AI! "
            "You can ask me to search for listings by city and budget (e.g. *'Flats in Kochi under 60 lakhs'*), "
            "or ask how to list your property as an owner."
        )


# Singleton instance
rag_engine = HomeQuestRAG()
