from django.urls import path
from .views import (
    ChatbotQueryView,
    ChatbotSuggestionsView,
    ChatbotDraftInquiryView,
    ChatbotAutoSendInquiryView,
)

urlpatterns = [
    path('query/', ChatbotQueryView.as_view(), name='chatbot_query'),
    path('suggestions/', ChatbotSuggestionsView.as_view(), name='chatbot_suggestions'),
    path('draft_inquiry/', ChatbotDraftInquiryView.as_view(), name='chatbot_draft_inquiry'),
    path('auto_send_inquiry/', ChatbotAutoSendInquiryView.as_view(), name='chatbot_auto_send_inquiry'),
]
