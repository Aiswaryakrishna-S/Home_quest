from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, EnquiryViewSet

router = DefaultRouter()
router.register(r'enquiries', EnquiryViewSet, basename='enquiry')
router.register(r'', PropertyViewSet, basename='property')

urlpatterns = [
    path('', include(router.urls)),
]
