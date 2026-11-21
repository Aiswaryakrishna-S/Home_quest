import random
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PendingRegistration, PasswordResetOTP
from .serializers import (
    RegisterSerializer,
    ResendOTPSerializer,
    UserSerializer,
    VerifyEmailSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()


def send_verification_email(email, username, otp_code):
    """Sends the 6-digit verification code to the recipient via Gmail SMTP."""
    subject = "Your 6-Digit Verification Code"
    message = (
        f"Hi {username},\n\n"
        f"Thank you for signing up! Your 6-digit email verification code is:\n\n"
        f"    {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you did not make this request, please ignore this email."
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER)
    send_mail(subject, message, from_email, [email], fail_silently=False)


def send_password_reset_email(email, username, otp_code):
    """Sends the 6-digit password reset code to the user via SMTP."""
    subject = "HomeQuest AI - Password Reset Verification Code"
    message = (
        f"Hi {username},\n\n"
        f"We received a request to reset your password for your HomeQuest AI account.\n\n"
        f"Your 6-digit password reset code is:\n\n"
        f"    {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you did not request a password reset, please ignore this email or contact support immediately.\n\n"
        f"Best regards,\nHomeQuest AI Security Team"
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER)
    send_mail(subject, message, from_email, [email], fail_silently=False)


# 1. Register APIView: Validates registration & sends 6-digit OTP (User not saved to User table yet)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        otp_code = f"{random.randint(100000, 999999)}"

        # Save temporarily in PendingRegistration
        pending = PendingRegistration.create_or_update(data, otp_code)

        # Dispatch email with the 6-digit code
        try:
            send_verification_email(pending.email, pending.username, otp_code)
        except Exception as e:
            return Response(
                {"error": f"Failed to send verification email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Verification code sent! Please submit the 6-digit OTP to complete your registration.",
                "email": pending.email,
            },
            status=status.HTTP_200_OK,
        )


# 2. VerifyEmail APIView: Validates 6-digit OTP & ONLY THEN creates user in DB
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp']

        # Find matching pending registration
        try:
            pending = PendingRegistration.objects.get(email__iexact=email, otp=otp_code)
        except PendingRegistration.DoesNotExist:
            return Response(
                {"error": "Invalid verification code or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not pending.is_valid():
            pending.delete()
            return Response(
                {"error": "Verification code has expired. Please register again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure username/email hasn't been taken in the meantime
        if User.objects.filter(username__iexact=pending.username).exists():
            return Response({"error": "Username was already registered."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=pending.email).exists():
            return Response({"error": "Email was already registered."}, status=status.HTTP_400_BAD_REQUEST)

        # USER IS OFFICIALLY CREATED IN THE DATABASE ONLY NOW
        user = User(
            username=pending.username,
            email=pending.email,
            password=pending.password,
            first_name=pending.first_name,
            last_name=pending.last_name,
            phone_number=pending.phone_number,
            role=pending.role,
            is_active=True,
            is_verified=True,
        )
        user.save()

        # Remove temporary pending record
        pending.delete()

        # Generate JWT tokens for instant login
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "OTP verified successfully! Your account has been created.",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


# 3. ResendOTP APIView: Generates and resends a fresh 6-digit code
class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"message": "This email is already registered and verified. Please log in."},
                status=status.HTTP_200_OK,
            )

        try:
            pending = PendingRegistration.objects.get(email__iexact=email)
        except PendingRegistration.DoesNotExist:
            return Response(
                {"error": "No pending registration found for this email. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        otp_code = f"{random.randint(100000, 999999)}"
        pending.otp = otp_code
        pending.save()

        try:
            send_verification_email(pending.email, pending.username, otp_code)
        except Exception as e:
            return Response(
                {"error": f"Failed to send email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "A fresh 6-digit verification code has been sent to your email."},
            status=status.HTTP_200_OK,
        )


# 4. Profile APIView: Protected user profile retrieval and update
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# 5. ForgotPassword APIView: Requests a 6-digit password reset OTP
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.get(email__iexact=email)

        otp_code = f"{random.randint(100000, 999999)}"
        PasswordResetOTP.create_or_update(email, otp_code)

        try:
            send_password_reset_email(email, user.username, otp_code)
        except Exception as e:
            return Response(
                {"error": f"Failed to send password reset email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "A 6-digit password reset code has been sent to your email.",
                "email": email,
            },
            status=status.HTTP_200_OK,
        )


# 6. ResetPassword APIView: Validates 6-digit OTP & updates user's password
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']

        # Validate OTP
        try:
            reset_record = PasswordResetOTP.objects.get(email__iexact=email, otp=otp_code)
        except PasswordResetOTP.DoesNotExist:
            return Response(
                {"error": "Invalid reset code or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_record.is_valid():
            reset_record.delete()
            return Response(
                {"error": "The reset code has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"error": "No user account found for this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update password
        user.set_password(new_password)
        user.save()

        # Invalidate OTP
        reset_record.delete()

        return Response(
            {
                "message": "Password reset successfully! You can now log in with your new password.",
            },
            status=status.HTTP_200_OK,
        )
