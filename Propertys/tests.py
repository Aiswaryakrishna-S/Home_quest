from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from Propertys.models import Property, Enquiry, PropertyPurchase, PropertyTourSchedule

User = get_user_model()


class PropertyAttributesAndPlotTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username='seller_test',
            email='seller_test@example.com',
            password='TestPassword123!',
            role='SELLER',
            is_verified=True
        )
        self.client.force_authenticate(user=self.seller)
        self.properties_url = reverse('property-list')

    def test_plot_attributes_automatically_cleared_on_create(self):
        """Plot properties must never save bathrooms, bhk, furnishing, or parking."""
        payload = {
            'title': 'Green Valley Acre',
            'property_type': 'PLOT',
            'sub_type': 'Residential Plot',
            'bhk': '3',
            'bathrooms': '2',
            'furnishing': 'Furnished',
            'car_parking': '2',
            'price': '4500000.00',
            'address': 'Valley Road',
            'city': 'Kannur',
            'state': 'Kerala',
            'area_sqft': 3500,
        }
        res = self.client.post(self.properties_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        prop = Property.objects.get(id=res.data['id'])
        self.assertEqual(prop.property_type, 'PLOT')
        self.assertEqual(prop.bhk, '')
        self.assertEqual(prop.bathrooms, '')
        self.assertEqual(prop.furnishing, '')
        self.assertEqual(prop.car_parking, '')
        self.assertIsNone(prop.carpet_area)
        self.assertIsNone(prop.total_floors)
        self.assertIsNone(prop.floor_no)

    def test_residential_attributes_saved_and_editable(self):
        """Residential properties (APARTMENT / BUILDING) properly save and allow editing bathrooms and bhk."""
        payload = {
            'title': 'Skyline Imperial 3BHK',
            'property_type': 'APARTMENT',
            'sub_type': 'Flats / Apartments',
            'bhk': '3',
            'bathrooms': '3',
            'furnishing': 'Semi-Furnished',
            'car_parking': '1',
            'price': '8500000.00',
            'address': 'Marine Drive',
            'city': 'Kochi',
            'state': 'Kerala',
            'area_sqft': 1750,
        }
        res = self.client.post(self.properties_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        prop_id = res.data['id']

        prop = Property.objects.get(id=prop_id)
        self.assertEqual(prop.bhk, '3')
        self.assertEqual(prop.bathrooms, '3')

        # Edit bathrooms and BHK
        update_url = reverse('property-detail', kwargs={'pk': prop_id})
        update_res = self.client.patch(update_url, {'bathrooms': '4', 'bhk': '4'}, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)

        prop.refresh_from_db()
        self.assertEqual(prop.bathrooms, '4')
        self.assertEqual(prop.bhk, '4')


class PropertyIsolationAndEnquiryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller1 = User.objects.create_user(username='s1', email='s1@test.com', password='pwd', role='SELLER', is_verified=True)
        self.seller2 = User.objects.create_user(username='s2', email='s2@test.com', password='pwd', role='SELLER', is_verified=True)
        self.buyer = User.objects.create_user(username='b1', email='b1@test.com', password='pwd', role='BUYER', is_verified=True)

        self.prop1 = Property.objects.create(
            seller=self.seller1,
            title="Seller 1's Villa",
            price=6000000,
            address="Road 1",
            city="Calicut",
            area_sqft=1800,
            property_type="BUILDING"
        )
        self.prop2 = Property.objects.create(
            seller=self.seller2,
            title="Seller 2's Apartment",
            price=4500000,
            address="Road 2",
            city="Kochi",
            area_sqft=1200,
            property_type="APARTMENT"
        )

    def test_owner_dashboard_isolation(self):
        """Owner dashboard GET /api/properties/?mine=true only returns properties belonging to that owner."""
        # Seller 1 requests their listings
        self.client.force_authenticate(user=self.seller1)
        res1 = self.client.get(f"{reverse('property-list')}?mine=true")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        prop_ids1 = [p['id'] for p in res1.data]
        self.assertIn(self.prop1.id, prop_ids1)
        self.assertNotIn(self.prop2.id, prop_ids1)

        # Seller 2 requests their listings
        self.client.force_authenticate(user=self.seller2)
        res2 = self.client.get(f"{reverse('property-list')}?mine=true")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        prop_ids2 = [p['id'] for p in res2.data]
        self.assertIn(self.prop2.id, prop_ids2)
        self.assertNotIn(self.prop1.id, prop_ids2)

    def test_enquiry_creation_and_owner_isolation(self):
        """Enquiries submitted on a property are visible to its owner, but isolated from other sellers."""
        self.client.force_authenticate(user=self.buyer)
        enquiry_res = self.client.post(reverse('enquiry-list'), {
            'property': self.prop1.id,
            'name': 'Interested Buyer',
            'email': 'buyer@example.com',
            'phone_number': '9876543210',
            'message': 'Is this property negotiable?'
        }, format='json')
        self.assertEqual(enquiry_res.status_code, status.HTTP_201_CREATED)

        # Seller 1 checks enquiries -> sees 1
        self.client.force_authenticate(user=self.seller1)
        s1_enquiries = self.client.get(reverse('enquiry-list'))
        self.assertEqual(s1_enquiries.status_code, status.HTTP_200_OK)
        self.assertEqual(len(s1_enquiries.data), 1)
        self.assertEqual(s1_enquiries.data[0]['property'], self.prop1.id)

        # Seller 2 checks enquiries -> sees 0
        self.client.force_authenticate(user=self.seller2)
        s2_enquiries = self.client.get(reverse('enquiry-list'))
        self.assertEqual(s2_enquiries.status_code, status.HTTP_200_OK)
        self.assertEqual(len(s2_enquiries.data), 0)


class TourAndPurchaseWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(username='seller_tour', email='stour@test.com', password='pwd', role='SELLER', is_verified=True)
        self.buyer = User.objects.create_user(username='buyer_tour', email='btour@test.com', password='pwd', role='BUYER', is_verified=True)
        self.prop = Property.objects.create(
            seller=self.seller,
            title='Emerald Heights',
            price=10000000,
            address='Hill View',
            city='Wayanad',
            area_sqft=2500,
            property_type='BUILDING'
        )

    def test_tour_scheduling_and_reschedule(self):
        """Buyer schedules a tour, then reschedules to a new date."""
        self.client.force_authenticate(user=self.buyer)
        tour_payload = {
            'property_id': self.prop.id,
            'scheduled_date': '2026-12-01',
            'time_slot': '10:00 AM - 11:30 AM',
            'visitor_name': 'Buyer Tour',
            'visitor_email': 'btour@test.com',
            'visitor_phone': '9876543210',
            'buyer_notes': 'Want to check foundation and water supply'
        }
        res = self.client.post(reverse('property_tour-list'), tour_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        tour_id = res.data['id']

        # Reschedule tour
        reschedule_url = reverse('property_tour-reschedule', kwargs={'pk': tour_id})
        resc_res = self.client.post(reschedule_url, {
            'new_date': '2026-12-05',
            'new_time_slot': '02:00 PM - 03:30 PM',
            'reason': 'Traveling on the earlier date'
        }, format='json')
        self.assertEqual(resc_res.status_code, status.HTTP_200_OK)

        tour = PropertyTourSchedule.objects.get(id=tour_id)
        self.assertEqual(str(tour.scheduled_date), '2026-12-05')
        self.assertEqual(tour.rescheduled_count, 1)

    def test_property_purchase_and_kerala_registration_costs(self):
        """Buyer initiates purchase booking; computes 8% Stamp Duty and 2% Registration Fee."""
        self.client.force_authenticate(user=self.buyer)
        purchase_payload = {
            'property': self.prop.id,
            'agreed_price': '10000000.00',
            'token_amount': '50000.00',
            'buyer_name': 'Verified Buyer',
            'buyer_email': 'btour@test.com',
            'buyer_phone': '9876543210',
            'payment_method': 'UPI'
        }
        res = self.client.post(reverse('property_purchase-list'), purchase_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        purchase = PropertyPurchase.objects.get(id=res.data['id'])
        self.assertTrue(purchase.agreement_number.startswith('HQ-KL-'))
        # 8% of 10,000,000 = 800,000
        self.assertEqual(purchase.stamp_duty, Decimal('800000.00'))
        # 2% of 10,000,000 = 200,000
        self.assertEqual(purchase.registration_fee, Decimal('200000.00'))
        # Total cost = 10,000,000 + 800,000 + 200,000 = 11,000,000
        self.assertEqual(purchase.total_estimated_cost, Decimal('11000000.00'))


class PropertyRecommendationAndMLTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='u_rec', email='urec@test.com', password='pwd', is_verified=True)
        self.prop = Property.objects.create(
            seller=self.user,
            title='Kakkanad Tech Villa',
            price=7500000,
            address='Infopark Road',
            city='Kakkanad',
            area_sqft=1800,
            property_type='BUILDING',
            latitude=Decimal('10.015900'),
            longitude=Decimal('76.341900')
        )

    def test_predict_price_endpoint(self):
        """POST /api/properties/predict_price/ generates ML price valuation."""
        url = reverse('property-predict-price')
        payload = {
            'city': 'Kakkanad',
            'property_type': 'BUILDING',
            'area_sqft': 1800,
            'latitude': 10.0159,
            'longitude': 76.3419,
            'current_price': 7500000
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('suggested_price', res.data)
        self.assertTrue(res.data.get('success'))

    def test_recommendations_endpoint(self):
        """GET /api/properties/recommendations/ returns recommendations successfully."""
        self.client.force_authenticate(user=self.user)
        url = reverse('property-recommendations')
        res = self.client.get(f"{url}?limit=4")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', res.data)
        self.assertIsInstance(res.data['recommendations'], list)

    def test_toggle_like_endpoint(self):
        """POST /api/properties/{id}/like/ toggles like status and counts."""
        self.client.force_authenticate(user=self.user)
        url = reverse('property-like', kwargs={'pk': self.prop.pk})
        
        # 1. Like property
        res = self.client.post(url, {})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('is_liked'))
        self.assertEqual(res.data.get('likes_count'), 1)

        # 2. Unlike property
        res2 = self.client.post(url, {})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(res2.data.get('is_liked'))
        self.assertEqual(res2.data.get('likes_count'), 0)

    def test_recommendations_with_liked_ids(self):
        """GET /api/properties/recommendations/?liked_ids=... returns tailored AI recommendations."""
        url = reverse('property-recommendations')
        res = self.client.get(f"{url}?limit=3&liked_ids={self.prop.pk}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', res.data)

