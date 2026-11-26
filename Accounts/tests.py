from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from Accounts.models import PendingRegistration, PasswordResetOTP, PropertyViewHistory, UserSearchHistory
from Propertys.models import Property

User = get_user_model()


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth_register')
        self.verify_url = reverse('verify_email')
        self.resend_url = reverse('resend_otp')
        self.login_url = reverse('token_obtain_pair')
        self.profile_url = reverse('auth_profile')
        self.forgot_url = reverse('forgot_password')
        self.reset_url = reverse('reset_password')

    def test_registration_and_verification_flow(self):
        """User registers, receives OTP in PendingRegistration, verifies, and logs in."""
        reg_data = {
            'username': 'testbuyer',
            'email': 'buyer@example.com',
            'password': 'StrongPassword123!',
            'first_name': 'Test',
            'last_name': 'Buyer',
            'role': 'BUYER',
            'phone_number': '9876543210'
        }
        res = self.client.post(self.register_url, reg_data, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Check pending registration created
        pending = PendingRegistration.objects.filter(email='buyer@example.com').first()
        self.assertIsNotNone(pending)
        otp = pending.otp
        self.assertEqual(len(otp), 6)

        # Verify with wrong OTP
        wrong_verify = self.client.post(self.verify_url, {'email': 'buyer@example.com', 'otp': '000000'}, format='json')
        self.assertEqual(wrong_verify.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify with correct OTP
        good_verify = self.client.post(self.verify_url, {'email': 'buyer@example.com', 'otp': otp}, format='json')
        self.assertIn(good_verify.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertIn('access', good_verify.data.get('tokens', {}))

        # User is now in User table
        user = User.objects.filter(email='buyer@example.com').first()
        self.assertIsNotNone(user)
        self.assertTrue(user.is_verified)
        self.assertEqual(user.username, 'testbuyer')

        # Login with credentials
        login_res = self.client.post(self.login_url, {'username': 'testbuyer', 'password': 'StrongPassword123!'}, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    def test_resend_otp(self):
        """Resend OTP updates PendingRegistration with a new code."""
        reg_data = {
            'username': 'resenduser',
            'email': 'resend@example.com',
            'password': 'Password123!',
            'role': 'BUYER'
        }
        self.client.post(self.register_url, reg_data, format='json')
        initial_pending = PendingRegistration.objects.get(email='resend@example.com')
        old_otp = initial_pending.otp

        res = self.client.post(self.resend_url, {'email': 'resend@example.com'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        new_pending = PendingRegistration.objects.get(email='resend@example.com')
        self.assertIsNotNone(new_pending.otp)

    def test_duplicate_registration_rejected(self):
        """Cannot register with already verified username or email."""
        User.objects.create_user(username='existinguser', email='existing@example.com', password='Password123!', is_verified=True)
        reg_data = {
            'username': 'existinguser',
            'email': 'new@example.com',
            'password': 'Password123!',
        }
        res = self.client.post(self.register_url, reg_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_forgot_and_reset_password_flow(self):
        """User requests password reset OTP, verifies, and changes password."""
        user = User.objects.create_user(username='resetuser', email='reset@example.com', password='OldPassword123!', is_verified=True)

        # Request reset OTP
        forgot_res = self.client.post(self.forgot_url, {'email': 'reset@example.com'}, format='json')
        self.assertEqual(forgot_res.status_code, status.HTTP_200_OK)

        otp_record = PasswordResetOTP.objects.filter(email='reset@example.com').first()
        self.assertIsNotNone(otp_record)
        otp = otp_record.otp

        # Reset password with correct OTP and matching confirm_password
        reset_res = self.client.post(self.reset_url, {
            'email': 'reset@example.com',
            'otp': otp,
            'new_password': 'BrandNewPassword123!',
            'confirm_password': 'BrandNewPassword123!'
        }, format='json')
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)

        # Login with new password
        login_res = self.client.post(self.login_url, {
            'username': 'resetuser',
            'password': 'BrandNewPassword123!'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)


class AccountsHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(username='seller1', email='s1@test.com', password='pwd', role='SELLER', is_verified=True)
        self.buyer = User.objects.create_user(username='buyer1', email='b1@test.com', password='pwd', role='BUYER', is_verified=True)
        self.property = Property.objects.create(
            seller=self.seller,
            title='Sunset Villa',
            price=5000000,
            address='Beach Road',
            city='Kochi',
            area_sqft=2200,
            property_type='BUILDING'
        )
        self.client.force_authenticate(user=self.buyer)

    def test_record_and_get_user_history(self):
        """Authenticated user records property view and search queries and retrieves history."""
        # Record view
        view_res = self.client.post(reverse('record_property_view'), {'property_id': self.property.id}, format='json')
        self.assertEqual(view_res.status_code, status.HTTP_200_OK)

        # Record search
        search_res = self.client.post(reverse('record_search_history'), {'query': 'Kochi Villa'}, format='json')
        self.assertIn(search_res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Retrieve history
        hist_res = self.client.get(reverse('user_history'))
        self.assertEqual(hist_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(hist_res.data['recent_properties']), 1)
        self.assertEqual(len(hist_res.data['recent_searches']), 1)
        self.assertEqual(hist_res.data['recent_searches'][0]['query'], 'Kochi Villa')
