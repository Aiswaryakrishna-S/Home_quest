from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class ChatbotAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_chatbot_suggestions(self):
        """GET /api/chatbot/suggestions/ returns prompt suggestions list."""
        url = reverse('chatbot_suggestions')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', res.data)
        self.assertGreater(len(res.data['suggestions']), 0)

    def test_chatbot_empty_query_rejected(self):
        """POST /api/chatbot/query/ without message returns 400 Bad Request."""
        url = reverse('chatbot_query')
        res = self.client.post(url, {'message': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_chatbot_valid_query(self):
        """POST /api/chatbot/query/ returns response from rag engine."""
        url = reverse('chatbot_query')
        res = self.client.post(url, {'message': 'Hello, how can I search for properties in Kochi?'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('reply', res.data)
