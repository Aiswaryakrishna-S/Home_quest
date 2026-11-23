from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, EnquiryViewSet, PropertyPurchaseViewSet, PropertyTourScheduleViewSet

router = DefaultRouter()
router.register(r'purchases', PropertyPurchaseViewSet, basename='property_purchase')
router.register(r'tours', PropertyTourScheduleViewSet, basename='property_tour')
router.register(r'visits', PropertyTourScheduleViewSet, basename='property_visit')
router.register(r'enquiries', EnquiryViewSet, basename='enquiry')
router.register(r'', PropertyViewSet, basename='property')

urlpatterns = [
    path('', include(router.urls)),
]
