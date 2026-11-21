from django.contrib.auth import get_user_model
from rest_framework import serializers

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
