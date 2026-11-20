from rest_framework import serializers
from .models import Property, Enquiry


class PropertySerializer(serializers.ModelSerializer):
    seller_name = serializers.SerializerMethodField()
    enquiry_count = serializers.SerializerMethodField()
    area = serializers.IntegerField(source='area_sqft', required=False, allow_null=True)

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
            'image',
            'enquiry_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'seller', 'seller_name', 'enquiry_count', 'created_at', 'updated_at']

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
                return request.build_absolute_uri(obj.property.image.url)
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
