# =====================================================================
# HOMEQUEST AI - CHATBOT API VIEWS
# =====================================================================

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .rag_engine import rag_engine
from Propertys.models import Property, Enquiry


class ChatbotQueryView(APIView):
    """
    RAG Chatbot query endpoint:
    POST /api/chatbot/query/
    Payload:
    {
        "message": "Find 3-BHK villa in Kochi under 80 lakhs",
        "history": [ ... ]
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])

        if not message:
            return Response(
                {"error": "A 'message' string is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = rag_engine.query(message, history)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Chatbot error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatbotSuggestionsView(APIView):
    """
    Returns quick prompt suggestions for the chat interface:
    GET /api/chatbot/suggestions/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        suggestions = [
            "🔍 Find 3BHK villas in Kakkanad under 80 Lakhs",
            "🛣️ How does the NH 66 ML price boost work?",
            "🏡 How do I list my property as an owner?",
            "📍 How do I search properties near my current location?",
            "🔑 How can I reset my password using OTP?",
        ]
        return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)


class ChatbotDraftInquiryView(APIView):
    """
    AI-Assisted Buyer Inquiry / Purchase Intent Generator:
    POST /api/chatbot/draft_inquiry/
    Payload:
    {
        "property_id": 14,
        "buyer_name": "Midhun",
        "buyer_email": "midhun@example.com",
        "buyer_phone": "+91 98765 43210",
        "intent_tone": "ready_to_buy" // "professional" | "site_visit" | "negotiation" | "ready_to_buy"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        property_id = request.data.get('property_id')
        user_request = request.data.get('user_request', '').strip()
        buyer_name = request.data.get('buyer_name', '').strip()
        buyer_email = request.data.get('buyer_email', '').strip()
        buyer_phone = request.data.get('buyer_phone', '').strip()
        intent_tone = request.data.get('intent_tone', 'ready_to_buy')

        # If user is authenticated, fall back to user attributes if blank
        if request.user and request.user.is_authenticated:
            if not buyer_name:
                buyer_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            if not buyer_email and request.user.email:
                buyer_email = request.user.email
            if not buyer_phone and getattr(request.user, 'phone_number', None):
                buyer_phone = request.user.phone_number

        if not buyer_name:
            buyer_name = 'Prospective Buyer'

        if not property_id:
            return Response(
                {"error": "A 'property_id' integer is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            prop = Property.objects.select_related('seller').get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {"error": f"Property with ID {property_id} was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        owner_name = "Property Owner"
        if prop.seller:
            full = f"{prop.seller.first_name} {prop.seller.last_name}".strip()
            owner_name = full or prop.seller.username

        try:
            draft_result = rag_engine.generate_ai_inquiry(
                property_obj=prop,
                buyer_name=buyer_name,
                buyer_email=buyer_email,
                buyer_phone=buyer_phone,
                intent_tone=intent_tone,
                user_request=user_request,
            )

            image_url = None
            if prop.image:
                try:
                    image_url = request.build_absolute_uri(prop.image.url)
                except Exception:
                    image_url = prop.image.url

            return Response({
                "property": {
                    "id": prop.id,
                    "title": prop.title,
                    "city": prop.city,
                    "address": prop.address,
                    "price": float(prop.price),
                    "formatted_price": prop.formatted_price,
                    "property_type": prop.property_type,
                    "area_sqft": prop.area_sqft,
                    "owner_name": owner_name,
                    "image": image_url,
                },
                "buyer": {
                    "name": buyer_name,
                    "email": buyer_email,
                    "phone": buyer_phone,
                },
                "intent_tone": intent_tone,
                "draft_message": draft_result['message'],
                "summary": draft_result['summary'],
                "is_ai_generated": draft_result['is_ai_generated'],
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Failed to draft inquiry: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatbotAutoSendInquiryView(APIView):
    """
    Automatically discovers who is sending from user credentials/session,
    generates a personalized explanation based on the user's specific request,
    and automatically creates & dispatches the inquiry directly to the property seller.
    POST /api/chatbot/auto_send_inquiry/
    Payload:
    {
        "property_id": 14,
        "user_request": "I want to buy this villa in Kakkanad with pre-approved financing",
        "buyer_name": "...",  // optional (auto-detected from request.user)
        "buyer_email": "...", // optional (auto-detected from request.user)
        "buyer_phone": "...", // optional (auto-detected from request.user)
        "intent_tone": "ready_to_buy"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        property_id = request.data.get('property_id')
        user_request = request.data.get('user_request', '').strip()
        buyer_name = request.data.get('buyer_name', '').strip()
        buyer_email = request.data.get('buyer_email', '').strip()
        buyer_phone = request.data.get('buyer_phone', '').strip()
        intent_tone = request.data.get('intent_tone', 'ready_to_buy')

        # 1. Automatically identify who is sending from request.user if authenticated
        sender_user = None
        if request.user and request.user.is_authenticated:
            sender_user = request.user
            if not buyer_name:
                buyer_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            if not buyer_email and request.user.email:
                buyer_email = request.user.email
            if not buyer_phone and getattr(request.user, 'phone_number', None):
                buyer_phone = request.user.phone_number

        if not buyer_name:
            buyer_name = "Interested Buyer"
        if not buyer_email:
            buyer_email = "buyer@homequest.ai"

        if not property_id:
            return Response(
                {"error": "A 'property_id' integer is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            prop = Property.objects.select_related('seller').get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {"error": f"Property with ID {property_id} was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        owner_name = "Property Owner"
        if prop.seller:
            full = f"{prop.seller.first_name} {prop.seller.last_name}".strip()
            owner_name = full or prop.seller.username

        try:
            # 2. AI automatically creates an explanation tailored to user request
            draft_result = rag_engine.generate_ai_inquiry(
                property_obj=prop,
                buyer_name=buyer_name,
                buyer_email=buyer_email,
                buyer_phone=buyer_phone,
                intent_tone=intent_tone,
                user_request=user_request,
            )
            ai_explanation = draft_result['message']

            # 3. Automatically create & dispatch the enquiry to the seller
            final_message = f"[✨ AI Express Interest - Auto-Generated]\n{ai_explanation}"
            enquiry = Enquiry.objects.create(
                property=prop,
                user=sender_user,
                name=buyer_name,
                email=buyer_email,
                phone_number=buyer_phone or '',
                message=final_message,
                status='PENDING',
            )

            image_url = None
            if prop.image:
                try:
                    image_url = request.build_absolute_uri(prop.image.url)
                except Exception:
                    image_url = prop.image.url

            return Response({
                "success": True,
                "enquiry_id": enquiry.id,
                "sender": {
                    "name": buyer_name,
                    "email": buyer_email,
                    "phone": buyer_phone,
                    "is_authenticated": bool(sender_user),
                },
                "property": {
                    "id": prop.id,
                    "title": prop.title,
                    "city": prop.city,
                    "address": prop.address,
                    "price": float(prop.price),
                    "formatted_price": prop.formatted_price,
                    "property_type": prop.property_type,
                    "area_sqft": prop.area_sqft,
                    "owner_name": owner_name,
                    "image": image_url,
                },
                "ai_explanation": ai_explanation,
                "status": "SENT_TO_SELLER",
                "message": f"Inquiry for '{prop.title}' automatically created and dispatched to {owner_name}!",
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Failed to auto-send inquiry: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
