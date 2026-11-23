# =====================================================================
# HOMEQUEST AI - PROPERTY & ENQUIRY VIEWSETS (WITH GEOLOCATION LOGIC)
# =====================================================================
import math
import uuid
import datetime
from decimal import Decimal
from django.db import models
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Property, Enquiry, PropertyPurchase
from .serializers import PropertySerializer, EnquirySerializer, PropertyPurchaseSerializer
from .permissions import IsOwnerOrReadOnly
from .ml_pricing import predict_and_analyze_property
from .agreement_generator import generate_sale_agreement_text


# Known reference coordinates for popular cities and Kerala districts (fallback when GPS isn't explicitly entered)
CITY_COORDINATES = {
    # Kerala Districts & Key Hubs
    'ernakulam': (9.9816, 76.2999),
    'kochi': (9.9312, 76.2673),
    'cochin': (9.9312, 76.2673),
    'kakkanad': (10.0159, 76.3419),
    'edappally': (10.0261, 76.3125),
    'aluva': (10.1076, 76.3516),
    'thiruvananthapuram': (8.5241, 76.9366),
    'trivandrum': (8.5241, 76.9366),
    'kazhakkoottam': (8.5686, 76.8731),
    'kozhikode': (11.2588, 75.7804),
    'calicut': (11.2588, 75.7804),
    'thrissur': (10.5276, 76.2144),
    'kottayam': (9.5916, 76.5222),
    'kollam': (8.8932, 76.6141),
    'alappuzha': (9.4981, 76.3388),
    'palakkad': (10.7867, 76.6548),
    'malappuram': (11.0510, 76.0711),
    'kannur': (11.8745, 75.3704),
    'kasaragod': (12.4996, 74.9869),
    'pathanamthitta': (9.2648, 76.7870),
    'idukki': (9.8959, 76.7184),
    'wayanad': (11.6103, 76.0827),
    # Other Major Indian Metros
    'mumbai': (19.0760, 72.8777),
    'delhi': (28.7041, 77.1025),
    'bangalore': (12.9716, 77.5946),
    'bengaluru': (12.9716, 77.5946),
    'hyderabad': (17.3850, 78.4867),
    'chennai': (13.0827, 80.2707),
    'kolkata': (22.5726, 88.3639),
    'pune': (18.5204, 73.8567),
    'ahmedabad': (23.0225, 72.5714),
    'chicago': (41.8781, -87.6298),
    'new york': (40.7128, -74.0060),
    'san francisco': (37.7749, -122.4194),
    'los angeles': (34.0522, -118.2437),
    'london': (51.5074, -0.1278),
    'dubai': (25.2048, 55.2708),
}


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class PropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling full CRUD on Properties with Leaflet GPS Geolocation:
    - GET /properties/ -> List properties (supports ?lat=...&lng=...&radius=... to filter and sort by distance)
    - GET /properties/nearby/ -> Direct endpoint to fetch properties ordered by proximity to GPS coordinates
    - POST /properties/ -> Create property (supports latitude, longitude, and multipart image)
    - GET /properties/{id}/ -> Retrieve details
    - PUT /properties/{id}/ -> Update property
    - PATCH /properties/{id}/ -> Partially update property
    - DELETE /properties/{id}/ -> Delete property
    - GET /properties/{id}/enquiries/ -> List enquiries for this property (owner/admin only)
    - POST /properties/{id}/enquiries/ -> Submit enquiry for this property
    """
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'city', 'address', 'description']
    ordering_fields = ['price', 'created_at', 'area_sqft']

    def get_queryset(self):
        user = self.request.user
        qs = Property.objects.all().select_related('seller').prefetch_related('enquiries')

        # Filter: only properties relating to the logged-in Seller
        mine = self.request.query_params.get('mine')
        seller_param = self.request.query_params.get('seller')

        if mine == 'true' or seller_param == 'me':
            if user.is_authenticated:
                return qs.filter(seller=user).order_by('-created_at')
            return qs.none()

        # Filter by specific seller ID if provided
        if seller_param and seller_param.isdigit():
            qs = qs.filter(seller_id=int(seller_param))

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """
        Overrides list to support real-time proximity sorting & distance calculation
        via ?lat=...&lng=...&radius=... query params.
        """
        queryset = self.filter_queryset(self.get_queryset())

        lat_param = request.query_params.get('lat') or request.query_params.get('latitude')
        lng_param = request.query_params.get('lng') or request.query_params.get('longitude')
        radius_param = request.query_params.get('radius')  # in kilometers

        if lat_param and lng_param:
            try:
                user_lat = float(lat_param)
                user_lng = float(lng_param)
                max_radius = float(radius_param) if radius_param else None

                properties_list = list(queryset)
                annotated_props = []

                for prop in properties_list:
                    # Resolve property coordinates (stored in DB or inferred from city)
                    p_lat = float(prop.latitude) if prop.latitude is not None else None
                    p_lng = float(prop.longitude) if prop.longitude is not None else None

                    if (p_lat is None or p_lng is None) and prop.city:
                        city_key = prop.city.strip().lower()
                        if city_key in CITY_COORDINATES:
                            p_lat, p_lng = CITY_COORDINATES[city_key]

                    if p_lat is not None and p_lng is not None:
                        dist = calculate_haversine_distance(user_lat, user_lng, p_lat, p_lng)
                        prop.distance_km = dist
                        if prop.latitude is None:
                            prop.latitude = p_lat
                            prop.longitude = p_lng

                        if max_radius is None or dist <= max_radius:
                            annotated_props.append(prop)
                    else:
                        prop.distance_km = None
                        if max_radius is None:
                            annotated_props.append(prop)

                # Sort by proximity: closest properties first
                annotated_props.sort(key=lambda p: (p.distance_km is None, p.distance_km or 999999))
                serializer = self.get_serializer(annotated_props, many=True)
                return Response(serializer.data)
            except (ValueError, TypeError):
                pass

        # Standard non-geo listing
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def nearby(self, request):
        """
        Dedicated endpoint to fetch properties near a specific GPS coordinate:
        GET /api/properties/nearby/?lat=19.076&lng=72.877&radius=50
        """
        lat_param = request.query_params.get('lat')
        lng_param = request.query_params.get('lng')

        if not lat_param or not lng_param:
            return Response(
                {"error": "Both 'lat' and 'lng' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_lat = float(lat_param)
            user_lng = float(lng_param)
            radius = float(request.query_params.get('radius', 50.0))  # Default 50 km
        except ValueError:
            return Response(
                {"error": "Invalid coordinates or radius supplied."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = Property.objects.all().select_related('seller')
        nearby_props = []

        for prop in qs:
            p_lat = float(prop.latitude) if prop.latitude is not None else None
            p_lng = float(prop.longitude) if prop.longitude is not None else None

            if (p_lat is None or p_lng is None) and prop.city:
                city_key = prop.city.strip().lower()
                if city_key in CITY_COORDINATES:
                    p_lat, p_lng = CITY_COORDINATES[city_key]

            if p_lat is not None and p_lng is not None:
                dist = calculate_haversine_distance(user_lat, user_lng, p_lat, p_lng)
                if dist <= radius:
                    prop.distance_km = dist
                    if prop.latitude is None:
                        prop.latitude = p_lat
                        prop.longitude = p_lng
                    nearby_props.append(prop)

        # Sort closest first
        nearby_props.sort(key=lambda p: p.distance_km)
        serializer = self.get_serializer(nearby_props, many=True)
        return Response({
            "user_location": {"latitude": user_lat, "longitude": user_lng},
            "radius_km": radius,
            "count": len(nearby_props),
            "results": serializer.data
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def predict_price(self, request):
        """
        AI ML Property Valuation & Area Increment Engine for Kerala:
        POST /api/properties/predict_price/
        Payload:
        {
            "city": "Kakkanad",
            "property_type": "BUILDING",
            "area_sqft": 1800,
            "latitude": 10.0159,
            "longitude": 76.3419,
            "current_price": 7500000
        }
        """
        data = request.data
        city = data.get('city') or 'Kochi'
        property_type = data.get('property_type') or 'BUILDING'
        area_sqft = data.get('area_sqft') or 1500
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        current_price = data.get('current_price') or data.get('price')

        try:
            analysis = predict_and_analyze_property(
                city=city,
                property_type=property_type,
                area_sqft=area_sqft,
                latitude=latitude,
                longitude=longitude,
                current_price=current_price
            )
            return Response(analysis, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Failed to calculate property valuation: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def recommendations(self, request):
        """
        AI ML Property Recommendations:
        GET /api/properties/recommendations/
        Automatically generates personalized suggestions based on the user's
        PropertyViewHistory and UserSearchHistory using Scikit-Learn Content-Based Cosine Similarity.
        """
        from .recommender_engine import PropertyRecommendationEngine
        user = request.user if (request.user and request.user.is_authenticated) else None
        try:
            limit = int(request.query_params.get('limit', 6))
        except (ValueError, TypeError):
            limit = 6

        recommended_props = PropertyRecommendationEngine.get_recommendations_for_user(
            user=user,
            limit=limit,
        )

        serializer = self.get_serializer(recommended_props, many=True)
        return Response({
            "is_personalized": bool(user),
            "count": len(recommended_props),
            "recommendations": serializer.data,
        })

    def perform_create(self, serializer):
        # Auto-fill coordinates from city if seller didn't provide lat/long
        validated_data = serializer.validated_data
        lat = validated_data.get('latitude')
        lng = validated_data.get('longitude')
        city = (validated_data.get('city') or '').strip().lower()

        if (lat is None or lng is None) and city in CITY_COORDINATES:
            city_lat, city_lng = CITY_COORDINATES[city]
            serializer.save(seller=self.request.user, latitude=city_lat, longitude=city_lng)
        else:
            serializer.save(seller=self.request.user)

    def perform_update(self, serializer):
        validated_data = serializer.validated_data
        lat = validated_data.get('latitude')
        lng = validated_data.get('longitude')
        city = (validated_data.get('city') or '').strip().lower()

        if (lat is None or lng is None) and city in CITY_COORDINATES:
            city_lat, city_lng = CITY_COORDINATES[city]
            serializer.save(latitude=city_lat, longitude=city_lng)
        else:
            serializer.save()

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.AllowAny])
    def enquiries(self, request, pk=None):
        property_obj = self.get_object()

        if request.method == 'POST':
            data = request.data.copy()
            data['property'] = property_obj.id
            serializer = EnquirySerializer(data=data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # GET method - only property owner or staff
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if property_obj.seller != request.user and not request.user.is_staff:
            return Response({'detail': 'You can only view enquiries for your own properties.'}, status=status.HTTP_403_FORBIDDEN)

        enquiries = property_obj.enquiries.all().order_by('-created_at')
        serializer = EnquirySerializer(enquiries, many=True, context={'request': request})
        return Response(serializer.data)


class EnquiryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Property Enquiries:
    - POST /api/properties/enquiries/ -> Anyone can submit an enquiry
    - GET /api/properties/enquiries/ -> Authenticated property owner sees all enquiries for their properties
    - PATCH /api/properties/enquiries/{id}/ -> Update status (Pending -> Contacted -> Resolved)
    - DELETE /api/properties/enquiries/{id}/ -> Delete enquiry
    """
    serializer_class = EnquirySerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        # Allow anyone to submit an enquiry or preflight OPTIONS
        if self.action == 'create' or self.request.method in ['POST', 'OPTIONS']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Enquiry.objects.none()

        # Admin or staff can see all
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            qs = Enquiry.objects.all().select_related('property', 'property__seller', 'user')
        else:
            # By default, owner sees enquiries for their own properties
            qs = Enquiry.objects.filter(property__seller=user).select_related('property', 'property__seller', 'user')

        # Optional filter by property_id query param
        property_id = self.request.query_params.get('property_id')
        if property_id:
            qs = qs.filter(property_id=property_id)

        # Optional filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class PropertyPurchaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Property Buy Transactions & Legal Agreement Documentation:
    - POST /api/properties/purchases/ -> Initiate purchase, pay token, and generate Sale Agreement Deed
    - GET /api/properties/purchases/ -> View purchases (buyer sees their purchases, seller sees purchases for their properties)
    - GET /api/properties/purchases/{id}/ -> Retrieve agreement details & deed
    - POST /api/properties/purchases/{id}/sign/ -> Digital signature confirmation
    """
    serializer_class = PropertyPurchaseSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            # Allow querying by agreement_number or buyer_email if provided in query params
            buyer_email = self.request.query_params.get('buyer_email')
            agr_num = self.request.query_params.get('agreement_number')
            if buyer_email:
                return PropertyPurchase.objects.filter(buyer_email__iexact=buyer_email).select_related('property', 'property__seller', 'buyer')
            if agr_num:
                return PropertyPurchase.objects.filter(agreement_number=agr_num).select_related('property', 'property__seller', 'buyer')
            return PropertyPurchase.objects.none()

        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            return PropertyPurchase.objects.all().select_related('property', 'property__seller', 'buyer')

        # If user is seller, return purchases on their properties; if buyer, return their purchases
        is_seller = getattr(user, 'role', '') == 'SELLER'
        if is_seller:
            return PropertyPurchase.objects.filter(property__seller=user).select_related('property', 'property__seller', 'buyer')
        else:
            return PropertyPurchase.objects.filter(
                models.Q(buyer=user) | models.Q(buyer_email__iexact=user.email)
            ).select_related('property', 'property__seller', 'buyer')

    def create(self, request, *args, **kwargs):
        data = request.data
        property_id = data.get('property') or data.get('property_id')
        if not property_id:
            return Response({"error": "Property ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            property_obj = Property.objects.select_related('seller').get(id=property_id)
        except Property.DoesNotExist:
            return Response({"error": f"Property #{property_id} was not found."}, status=status.HTTP_404_NOT_FOUND)

        # Automatically determine buyer details
        buyer_user = request.user if request.user.is_authenticated else None
        buyer_name = (data.get('buyer_name') or '').strip()
        buyer_email = (data.get('buyer_email') or '').strip()
        buyer_phone = (data.get('buyer_phone') or '').strip()
        buyer_address = (data.get('buyer_address') or '').strip()

        if buyer_user:
            if not buyer_name:
                buyer_name = f"{buyer_user.first_name} {buyer_user.last_name}".strip() or buyer_user.username
            if not buyer_email and buyer_user.email:
                buyer_email = buyer_user.email
            if not buyer_phone and getattr(buyer_user, 'phone_number', None):
                buyer_phone = buyer_user.phone_number

        if not buyer_name:
            buyer_name = "HomeQuest Verified Buyer"
        if not buyer_email:
            buyer_email = "buyer@homequest.ai"

        # Financial Calculations
        try:
            agreed_price = Decimal(str(data.get('agreed_price') or property_obj.price))
        except Exception:
            agreed_price = Decimal(str(property_obj.price))

        try:
            token_amount = Decimal(str(data.get('token_amount') or 50000.00))
        except Exception:
            token_amount = Decimal('50000.00')

        if token_amount > agreed_price:
            token_amount = agreed_price

        balance_amount = agreed_price - token_amount
        stamp_duty = (agreed_price * Decimal('0.08')).quantize(Decimal('0.01'))        # Kerala Stamp Duty (8%)
        registration_fee = (agreed_price * Decimal('0.02')).quantize(Decimal('0.01'))  # Kerala Registration Fee (2%)
        total_estimated_cost = agreed_price + stamp_duty + registration_fee

        payment_method = data.get('payment_method') or 'UPI'
        transaction_id = data.get('transaction_id') or f"TXN-KL-{uuid.uuid4().hex[:8].upper()}"

        # Generate Unique Agreement Reference Number: HQ-KL-2026-XXXXXX
        agr_num = f"HQ-KL-{datetime.datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"

        settlement_days = int(data.get('settlement_days') or 60)
        settlement_deadline = datetime.date.today() + datetime.timedelta(days=settlement_days)

        # Generate full legally structured sale agreement document
        agreement_text = generate_sale_agreement_text(
            agreement_number=agr_num,
            property_obj=property_obj,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            buyer_address=buyer_address,
            agreed_price=agreed_price,
            token_amount=token_amount,
            balance_amount=balance_amount,
            stamp_duty=stamp_duty,
            registration_fee=registration_fee,
            total_cost=total_estimated_cost,
            payment_method=payment_method,
            transaction_id=transaction_id,
            settlement_deadline_str=settlement_deadline.strftime('%d %B, %Y')
        )

        purchase = PropertyPurchase.objects.create(
            agreement_number=agr_num,
            property=property_obj,
            buyer=buyer_user,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            buyer_address=buyer_address,
            agreed_price=agreed_price,
            token_amount=token_amount,
            balance_amount=balance_amount,
            stamp_duty=stamp_duty,
            registration_fee=registration_fee,
            total_estimated_cost=total_estimated_cost,
            payment_method=payment_method,
            transaction_id=transaction_id,
            status='TOKEN_PAID',
            agreement_document=agreement_text,
            settlement_deadline=settlement_deadline,
            buyer_signed_at=timezone.now(),
        )

        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def sign(self, request, pk=None):
        purchase = self.get_object()
        signer_role = request.data.get('role', 'BUYER').upper()
        now = timezone.now()

        if signer_role == 'SELLER':
            purchase.seller_signed_at = now
            if purchase.buyer_signed_at:
                purchase.status = 'AGREEMENT_SIGNED'
        else:
            purchase.buyer_signed_at = now
            if purchase.seller_signed_at:
                purchase.status = 'AGREEMENT_SIGNED'

        purchase.save()
        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_200_OK)

