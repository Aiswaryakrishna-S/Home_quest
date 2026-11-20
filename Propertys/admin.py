from django.contrib import admin
from .models import Property, Enquiry


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('title', 'property_type', 'city', 'price', 'seller', 'created_at')
    list_filter = ('property_type', 'city', 'created_at')
    search_fields = ('title', 'address', 'city', 'seller__username', 'seller__email')


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone_number', 'property', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'phone_number', 'property__title', 'message')
