from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, EnquiryViewSet, PropertyPurchaseViewSet

router = DefaultRouter()
router.register(r'purchases', PropertyPurchaseViewSet, basename='property_purchase')
router.register(r'enquiries', EnquiryViewSet, basename='enquiry')
router.register(r'', PropertyViewSet, basename='property')

urlpatterns = [
    path('', include(router.urls)),
]
