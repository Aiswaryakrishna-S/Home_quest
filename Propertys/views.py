# =====================================================================
# HOMEQUEST AI - PROPERTY & ENQUIRY VIEWSETS
# =====================================================================
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Property, Enquiry
from .serializers import PropertySerializer, EnquirySerializer
from .permissions import IsOwnerOrReadOnly


class PropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling full CRUD on Properties:
    - GET /properties/ -> List properties (supports ?mine=true or ?seller=me to fetch only seller's properties)
    - POST /properties/ -> Create property (multipart/form-data supported)
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

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

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
