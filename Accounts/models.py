import random
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        AGENT = 'AGENT', 'Agent'
        BUYER = 'BUYER', 'Buyer'
        SELLER = 'SELLER', 'Seller'

    email = models.EmailField(unique=True, verbose_name="Email Address")
    phone_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Phone Number")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BUYER, verbose_name="Role")
    
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True, verbose_name="Profile Picture")
    bio = models.TextField(blank=True, null=True, verbose_name="Bio")
    address = models.CharField(max_length=255, blank=True, null=True, verbose_name="Address")
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="City")
    
    is_verified = models.BooleanField(default=False, verbose_name="Email/Identity Verified")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return f"{self.username} ({self.email}) - {self.role}"


class PendingRegistration(models.Model):
    """Holds registration data temporarily. User is ONLY saved to User table upon entering the correct OTP."""
    username = models.CharField(max_length=150)
    email = models.EmailField()
    password = models.CharField(max_length=255)  # Pre-hashed password
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, default=User.Role.BUYER)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # 6-digit OTP expires in 10 minutes
        return timezone.now() <= self.created_at + timedelta(minutes=10)

    @classmethod
    def create_or_update(cls, data, otp_code):
        from django.contrib.auth.hashers import make_password
        # Invalidate any older pending attempts for the same username or email
        cls.objects.filter(email__iexact=data['email']).delete()
        cls.objects.filter(username__iexact=data['username']).delete()

        return cls.objects.create(
            username=data['username'],
            email=data['email'],
            password=make_password(data['password']),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            phone_number=data.get('phone_number', None),
            role=data.get('role', User.Role.BUYER),
            otp=otp_code,
        )

    def __str__(self):
        return f"Pending: {self.username} ({self.email}) - Code: {self.otp}"


class PasswordResetOTP(models.Model):
    """Holds 6-digit OTP for password reset requests."""
    email = models.EmailField(verbose_name="User Email")
    otp = models.CharField(max_length=6, verbose_name="Reset OTP")
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # 6-digit OTP expires in 10 minutes
        return timezone.now() <= self.created_at + timedelta(minutes=10)

    @classmethod
    def create_or_update(cls, email, otp_code):
        # Invalidate any older reset attempts for this email
        cls.objects.filter(email__iexact=email).delete()
        return cls.objects.create(email=email.strip().lower(), otp=otp_code)

    def __str__(self):
        return f"Reset OTP: {self.email} - Code: {self.otp}"
