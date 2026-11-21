# =====================================================================
# HOMEQUEST AI - LIVE SYNC TEST: VERIFIED ACTIVE IN BACKEND (VS CODE)
# Status: Live Connected at 2026-11-20
# =====================================================================

from django.db import models
from django.conf import settings


class Property(models.Model):
    """A real‑estate listing owned by a seller."""

    # ── Property type choices (Building, Plot, Rental, Apartment, Real Estate) ──
    class PropertyType(models.TextChoices):
        BUILDING    = 'BUILDING',    'Building'
        PLOT        = 'PLOT',        'Plot'
        RENTAL      = 'RENTAL',      'Rental'
        APARTMENT   = 'APARTMENT',   'Apartment'
        REAL_ESTATE = 'REAL_ESTATE', 'Real Estate'

    # ── Relation to the seller (User) ──
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='properties'   # <-- you can now do user.properties.all()
    )

    # ── Core property fields ──
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price       = models.DecimalField(max_digits=12, decimal_places=2)
    address     = models.CharField(max_length=255)
    city        = models.CharField(max_length=100)
    state       = models.CharField(max_length=100, blank=True)
    zip_code    = models.CharField(max_length=20, blank=True)

    area_sqft   = models.PositiveIntegerField(help_text='Square feet')

    # ── New field: property type ──
    property_type = models.CharField(
        max_length=20,
        choices=PropertyType.choices,
        default=PropertyType.BUILDING,
    )

    # ── Optional image upload ──
    image = models.ImageField(upload_to='property_images/', blank=True, null=True)

    # ── Geographic Coordinates (Leaflet GPS Integration) ──
    latitude  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text='GPS Latitude')
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text='GPS Longitude')

    # ── Timestamps ──
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Properties'

    def __str__(self):
        return f"{self.title} – {self.city}"

    @property
    def formatted_price(self):
        """Helper returning formatted price string e.g. ₹75,000"""
        return f"₹{self.price:,.2f}"


class Enquiry(models.Model):
    """Inquiry made by a user/buyer on a specific property."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONTACTED', 'Contacted'),
        ('RESOLVED', 'Resolved'),
    ]

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='enquiries',
        verbose_name="Property"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_enquiries',
        verbose_name="Enquiring User"
    )
    name = models.CharField(max_length=150, verbose_name="Enquirer Name")
    email = models.EmailField(verbose_name="Enquirer Email")
    phone_number = models.CharField(max_length=20, verbose_name="Enquirer Phone")
    message = models.TextField(verbose_name="Message / Query")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name="Status"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Enquiries'

    def __str__(self):
        return f"Enquiry by {self.name} on {self.property.title} ({self.status})"
