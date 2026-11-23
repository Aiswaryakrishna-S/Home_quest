from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import PropertyViewHistory, UserSearchHistory

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone_number',
            'role',
            'profile_picture',
            'bio',
            'address',
            'city',
            'is_verified',
            'created_at',
        )
        read_only_fields = ('id', 'is_verified', 'created_at')


class RegisterSerializer(serializers.Serializer):
    """Validates registration input before issuing the 6-digit OTP."""
    username = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True, default=None)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.BUYER)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username is already registered.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email is already registered.")
        return value


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(max_length=6, min_length=6, required=True)


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ForgotPasswordSerializer(serializers.Serializer):
    """Validates that the email belongs to a registered user."""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        val = value.strip().lower()
        if not User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("No registered account found with this email address.")
        return val


class ResetPasswordSerializer(serializers.Serializer):
    """Validates OTP and new password requirements."""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(max_length=6, min_length=6, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, min_length=8, style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class PropertyViewHistorySerializer(serializers.ModelSerializer):
    property_id = serializers.IntegerField(source='property.id', read_only=True)
    title = serializers.CharField(source='property.title', read_only=True)
    price = serializers.DecimalField(source='property.price', max_digits=12, decimal_places=2, read_only=True)
    formatted_price = serializers.SerializerMethodField()
    city = serializers.CharField(source='property.city', read_only=True)
    state = serializers.CharField(source='property.state', read_only=True)
    property_type = serializers.CharField(source='property.property_type', read_only=True)
    area_sqft = serializers.IntegerField(source='property.area_sqft', read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = PropertyViewHistory
        fields = [
            'id',
            'property_id',
            'title',
            'price',
            'formatted_price',
            'city',
            'state',
            'property_type',
            'area_sqft',
            'image',
            'view_count',
            'viewed_at',
        ]

    def get_formatted_price(self, obj):
        try:
            return f"₹{float(obj.property.price):,.0f}"
        except Exception:
            return f"₹{obj.property.price}"

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.property and obj.property.image:
            url = obj.property.image.url
            if request:
                try:
                    return request.build_absolute_uri(url)
                except Exception:
                    pass
            return f"http://127.0.0.1:8000{url}"
        return None


class UserSearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSearchHistory
        fields = [
            'id',
            'query',
            'city',
            'property_type',
            'latitude',
            'longitude',
            'results_count',
            'searched_at',
        ]

