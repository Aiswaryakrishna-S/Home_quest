from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import PendingRegistration, User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'email', 'role', 'phone_number', 'is_staff', 'is_active', 'is_verified')
    list_filter = ('role', 'is_staff', 'is_active', 'is_verified')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Profile Information', {
            'fields': ('role', 'phone_number', 'profile_picture', 'bio', 'address', 'city', 'is_verified')
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Profile Information', {
            'fields': ('email', 'role', 'phone_number')
        }),
    )

@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'otp', 'role', 'created_at', 'is_valid')
    search_fields = ('username', 'email', 'otp')
