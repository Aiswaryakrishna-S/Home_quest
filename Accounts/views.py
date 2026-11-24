import random
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PendingRegistration, PasswordResetOTP, PropertyViewHistory, UserSearchHistory
from .serializers import (
    RegisterSerializer,
    ResendOTPSerializer,
    UserSerializer,
    VerifyEmailSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    PropertyViewHistorySerializer,
    UserSearchHistorySerializer,
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
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', getattr(settings, 'EMAIL_HOST_USER', 'noreply@homequest.com'))
    try:
        send_mail(subject, message, from_email, [email], fail_silently=False)
    except Exception as e:
        print(f"SMTP send warning: {e}")
        print(f"==================================================")
        print(f"[DEV DEBUG] PASSWORD RESET OTP FOR {email}: {otp_code}")
        print(f"==================================================")
        if not getattr(settings, 'DEBUG', False):
            raise e


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
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"error": "No registered account found with this email address."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        user = User.objects.filter(email__iexact=email).first()
        if not user:
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


class RecordPropertyViewAPI(APIView):
    """
    Records a property view for an authenticated user.
    Only accessible after user login.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        property_id = request.data.get('property_id') or request.data.get('property')
        if not property_id:
            return Response(
                {"error": "property_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from Propertys.models import Property
        prop = Property.objects.filter(id=property_id).first()
        if not prop:
            return Response(
                {"error": "Property not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Upsert view history (increments count if already viewed)
        view_record, created = PropertyViewHistory.objects.get_or_create(
            user=request.user,
            property=prop,
        )
        if not created:
            view_record.view_count += 1
            view_record.save(update_fields=['view_count', 'viewed_at'])

        return Response(
            {
                "status": "success",
                "property_id": prop.id,
                "view_count": view_record.view_count,
                "viewed_at": view_record.viewed_at,
            },
            status=status.HTTP_200_OK,
        )


class RecordSearchHistoryAPI(APIView):
    """
    Records a location/keyword search performed by an authenticated user.
    Only accessible after user login.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get('query', '').strip()
        city = request.data.get('city', '').strip()

        # If both query and city are empty, skip recording
        if not query and not city:
            return Response(
                {"error": "Search query or city is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        search_text = query or city
        prop_type = request.data.get('property_type', 'ALL')
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        results_count = request.data.get('results_count', 0)

        # Avoid spamming duplicate identical consecutive searches
        latest_search = UserSearchHistory.objects.filter(user=request.user).first()
        if latest_search and latest_search.query.lower() == search_text.lower() and latest_search.city == (city or None):
            # Update results count and timestamp
            latest_search.results_count = results_count
            latest_search.save(update_fields=['results_count', 'searched_at'])
            return Response({"status": "updated", "id": latest_search.id}, status=status.HTTP_200_OK)

        record = UserSearchHistory.objects.create(
            user=request.user,
            query=search_text,
            city=city or None,
            property_type=prop_type or 'ALL',
            latitude=lat if lat is not None else None,
            longitude=lng if lng is not None else None,
            results_count=results_count,
        )

        # Cap search history at 30 recent entries to keep DB lean
        extra_ids = list(
            UserSearchHistory.objects.filter(user=request.user)
            .values_list('id', flat=True)[30:]
        )
        if extra_ids:
            UserSearchHistory.objects.filter(id__in=extra_ids).delete()

        return Response(
            {"status": "recorded", "id": record.id},
            status=status.HTTP_201_CREATED,
        )


class UserHistoryAPI(APIView):
    """
    Retrieves and manages the authenticated user's browsing and search history.
    Strictly protected by JWT authentication.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch up to 12 recently viewed properties
        views = (
            PropertyViewHistory.objects.filter(user=request.user)
            .select_related('property')[:12]
        )
        # Fetch up to 15 recent searches
        searches = UserSearchHistory.objects.filter(user=request.user)[:15]

        views_data = PropertyViewHistorySerializer(
            views, many=True, context={'request': request}
        ).data
        searches_data = UserSearchHistorySerializer(searches, many=True).data

        return Response(
            {
                "recent_properties": views_data,
                "recent_searches": searches_data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        """Allows user to clear all, specific history type, or a single item."""
        target_type = request.data.get('type') or request.query_params.get('type')
        item_id = request.data.get('id') or request.query_params.get('id')

        # Single item deletion
        if item_id:
            if target_type == 'properties':
                deleted, _ = PropertyViewHistory.objects.filter(user=request.user, id=item_id).delete()
                return Response({"message": "Property view removed.", "count": deleted})
            else:
                deleted, _ = UserSearchHistory.objects.filter(user=request.user, id=item_id).delete()
                return Response({"message": "Search history item removed.", "count": deleted})

        if target_type == 'properties':
            deleted_count, _ = PropertyViewHistory.objects.filter(user=request.user).delete()
            return Response({"message": "Property view history cleared.", "count": deleted_count})
        elif target_type == 'searches':
            deleted_count, _ = UserSearchHistory.objects.filter(user=request.user).delete()
            return Response({"message": "Search history cleared.", "count": deleted_count})
        else:
            p_count, _ = PropertyViewHistory.objects.filter(user=request.user).delete()
            s_count, _ = UserSearchHistory.objects.filter(user=request.user).delete()
            return Response({
                "message": "All history cleared.",
                "deleted_views": p_count,
                "deleted_searches": s_count,
            })

