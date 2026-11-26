from rest_framework import serializers
from .models import Property, PropertyImage, Enquiry, PropertyPurchase, PropertyTourSchedule


class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ['id', 'property', 'image', 'description', 'created_at']
        read_only_fields = ['id', 'property', 'created_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image:
            if request:
                try:
                    ret['image'] = request.build_absolute_uri(instance.image.url)
                except Exception:
                    ret['image'] = f"http://127.0.0.1:8000{instance.image.url}"
            else:
                ret['image'] = f"http://127.0.0.1:8000{instance.image.url}"
        return ret


class PropertySerializer(serializers.ModelSerializer):
    seller_name = serializers.SerializerMethodField()
    enquiry_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    gallery_images = PropertyImageSerializer(many=True, read_only=True)
    area = serializers.IntegerField(source='area_sqft', required=False, allow_null=True)
    distance_km = serializers.FloatField(read_only=True, required=False, default=None)

    class Meta:
        model = Property
        fields = [
            'id',
            'seller',
            'seller_name',
            'title',
            'description',
            'price',
            'address',
            'city',
            'state',
            'zip_code',
            'area_sqft',
            'area',
            'property_type',
            'sub_type',
            'bhk',
            'bathrooms',
            'furnishing',
            'project_status',
            'listed_by',
            'carpet_area',
            'maintenance_monthly',
            'total_floors',
            'floor_no',
            'car_parking',
            'facing',
            'project_name',
            'image',
            'gallery_images',
            'latitude',
            'longitude',
            'distance_km',
            'enquiry_count',
            'likes_count',
            'is_liked',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'seller', 'seller_name', 'enquiry_count', 'likes_count', 'is_liked', 'distance_km', 'created_at', 'updated_at']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if hasattr(instance, 'image') and instance.image:
            if request:
                try:
                    ret['image'] = request.build_absolute_uri(instance.image.url)
                except Exception:
                    ret['image'] = f"http://127.0.0.1:8000{instance.image.url}"
            else:
                ret['image'] = f"http://127.0.0.1:8000{instance.image.url}"

        # Attach ML Recommender metadata if present on instance
        if hasattr(instance, 'match_score'):
            ret['match_score'] = instance.match_score
        if hasattr(instance, 'match_percentage'):
            ret['match_percentage'] = instance.match_percentage
        if hasattr(instance, 'ai_reason'):
            ret['ai_reason'] = instance.ai_reason

        return ret

    def get_seller_name(self, obj):
        if obj.seller:
            full_name = f"{obj.seller.first_name} {obj.seller.last_name}".strip()
            return full_name if full_name else obj.seller.username
        return "Unknown"

    def get_enquiry_count(self, obj):
        return obj.enquiries.count()

    def to_internal_value(self, data):
        # Support both 'area' and 'area_sqft' from requests
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'area' in mutable_data and not mutable_data.get('area_sqft'):
            try:
                mutable_data['area_sqft'] = int(mutable_data['area'])
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(mutable_data)

    def validate(self, attrs):
        prop_type = attrs.get('property_type')
        if not prop_type and self.instance:
            prop_type = self.instance.property_type
        if prop_type == 'PLOT':
            attrs['bhk'] = ''
            attrs['bathrooms'] = ''
            attrs['furnishing'] = ''
            attrs['project_status'] = ''
            attrs['carpet_area'] = None
            attrs['total_floors'] = None
            attrs['floor_no'] = None
            attrs['car_parking'] = ''
        return super().validate(attrs)

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['seller'] = request.user
        return super().create(validated_data)


class EnquirySerializer(serializers.ModelSerializer):
    property_title = serializers.ReadOnlyField(source='property.title')
    property_price = serializers.ReadOnlyField(source='property.price')
    property_city = serializers.ReadOnlyField(source='property.city')
    property_image = serializers.SerializerMethodField()
    owner_id = serializers.ReadOnlyField(source='property.seller.id')
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Enquiry
        fields = [
            'id',
            'property',
            'property_title',
            'property_price',
            'property_city',
            'property_image',
            'owner_id',
            'owner_name',
            'user',
            'name',
            'email',
            'phone_number',
            'message',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'property_title',
            'property_price',
            'property_city',
            'property_image',
            'owner_id',
            'owner_name',
            'created_at',
            'updated_at',
        ]

    def get_property_image(self, obj):
        if obj.property and obj.property.image:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.property.image.url)
                except Exception:
                    return obj.property.image.url
            return obj.property.image.url
        return None

    def get_owner_name(self, obj):
        if obj.property and obj.property.seller:
            full = f"{obj.property.seller.first_name} {obj.property.seller.last_name}".strip()
            return full if full else obj.property.seller.username
        return "Unknown"

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)


class PropertyPurchaseSerializer(serializers.ModelSerializer):
    property_title = serializers.ReadOnlyField(source='property.title')
    property_city = serializers.ReadOnlyField(source='property.city')
    property_type = serializers.ReadOnlyField(source='property.property_type')
    property_image = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    seller_email = serializers.ReadOnlyField(source='property.seller.email')
    seller_phone = serializers.SerializerMethodField()

    class Meta:
        model = PropertyPurchase
        fields = [
            'id',
            'agreement_number',
            'property',
            'property_title',
            'property_city',
            'property_type',
            'property_image',
            'seller_name',
            'seller_email',
            'seller_phone',
            'buyer',
            'buyer_name',
            'buyer_email',
            'buyer_phone',
            'buyer_address',
            'agreed_price',
            'token_amount',
            'balance_amount',
            'stamp_duty',
            'registration_fee',
            'total_estimated_cost',
            'payment_method',
            'transaction_id',
            'status',
            'agreement_document',
            'settlement_deadline',
            'buyer_signed_at',
            'seller_signed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'agreement_number',
            'buyer',
            'property_title',
            'property_city',
            'property_type',
            'property_image',
            'seller_name',
            'seller_email',
            'seller_phone',
            'balance_amount',
            'stamp_duty',
            'registration_fee',
            'total_estimated_cost',
            'agreement_document',
            'created_at',
            'updated_at',
        ]

    def get_property_image(self, obj):
        if obj.property and obj.property.image:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.property.image.url)
                except Exception:
                    return f"http://127.0.0.1:8000{obj.property.image.url}"
            return f"http://127.0.0.1:8000{obj.property.image.url}"
        return None

    def get_seller_name(self, obj):
        if obj.property and obj.property.seller:
            full = f"{obj.property.seller.first_name} {obj.property.seller.last_name}".strip()
            return full if full else obj.property.seller.username
        return "Property Owner"

    def get_seller_phone(self, obj):
        if obj.property and obj.property.seller:
            return getattr(obj.property.seller, 'phone_number', None) or "+91 (Verified Seller)"
        return "+91 (Verified Seller)"


class PropertyTourScheduleSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_city = serializers.CharField(source='property.city', read_only=True)
    property_address = serializers.CharField(source='property.address', read_only=True)
    property_price = serializers.DecimalField(source='property.price', max_digits=12, decimal_places=2, read_only=True)
    property_type = serializers.CharField(source='property.property_type', read_only=True)
    property_image = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    seller_phone = serializers.SerializerMethodField()
    seller_email = serializers.CharField(source='seller.email', read_only=True)
    buyer_name = serializers.SerializerMethodField()

    class Meta:
        model = PropertyTourSchedule
        fields = [
            'id',
            'property',
            'property_title',
            'property_city',
            'property_address',
            'property_price',
            'property_type',
            'property_image',
            'buyer',
            'buyer_name',
            'seller',
            'seller_name',
            'seller_phone',
            'seller_email',
            'visitor_name',
            'visitor_phone',
            'visitor_email',
            'scheduled_date',
            'time_slot',
            'status',
            'rescheduled_count',
            'previous_date',
            'previous_time_slot',
            'reschedule_reason',
            'buyer_notes',
            'seller_notes',
            'buyer_checklist',
            'seller_checklist',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'buyer',
            'seller',
            'property_title',
            'property_city',
            'property_address',
            'property_price',
            'property_type',
            'property_image',
            'seller_name',
            'seller_phone',
            'seller_email',
            'buyer_name',
            'rescheduled_count',
            'previous_date',
            'previous_time_slot',
            'created_at',
            'updated_at',
        ]

    def get_property_image(self, obj):
        if obj.property and obj.property.image:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.property.image.url)
                except Exception:
                    return f"http://127.0.0.1:8000{obj.property.image.url}"
            return f"http://127.0.0.1:8000{obj.property.image.url}"
        return None

    def get_seller_name(self, obj):
        if obj.seller:
            full = f"{obj.seller.first_name} {obj.seller.last_name}".strip()
            return full if full else obj.seller.username
        return "Host / Owner"

    def get_seller_phone(self, obj):
        if obj.seller:
            return getattr(obj.seller, 'phone_number', None) or "+91 (Verified Host)"
        return "+91 (Verified Host)"

    def get_buyer_name(self, obj):
        if obj.buyer:
            full = f"{obj.buyer.first_name} {obj.buyer.last_name}".strip()
            return full if full else obj.buyer.username
        return obj.visitor_name


