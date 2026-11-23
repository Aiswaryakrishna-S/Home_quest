from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    ProfileView,
    RegisterView,
    ResendOTPView,
    VerifyEmailView,
    ForgotPasswordView,
    ResetPasswordView,
    RecordPropertyViewAPI,
    RecordSearchHistoryAPI,
    UserHistoryAPI,
)

urlpatterns = [
    # Registration & 6-digit email verification
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend_otp'),

    # Password Reset & Recovery
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),

    # JWT Login & Refresh
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Protected user profile
    path('profile/', ProfileView.as_view(), name='auth_profile'),

    # Protected user browsing & search history (only for authenticated users)
    path('history/', UserHistoryAPI.as_view(), name='user_history'),
    path('history/view/', RecordPropertyViewAPI.as_view(), name='record_property_view'),
    path('history/search/', RecordSearchHistoryAPI.as_view(), name='record_search_history'),
]
