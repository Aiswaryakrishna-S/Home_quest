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


class PropertyPurchase(models.Model):
    """
    Purchase booking and legally structured Sale Agreement documentation
    generated when a buyer initiates a property purchase.
    """
    STATUS_CHOICES = [
        ('INITIATED', 'Purchase Initiated'),
        ('TOKEN_PAID', 'Token Advance Paid'),
        ('AGREEMENT_SIGNED', 'Agreement Digitally Signed'),
        ('COMPLETED', 'Fully Paid & Transferred'),
        ('CANCELLED', 'Cancelled'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('UPI', 'UPI / Instant Payment (GPay, PhonePe, Paytm)'),
        ('NET_BANKING', 'Net Banking / NEFT / RTGS'),
        ('CARD', 'Credit / Debit Card'),
        ('DEMAND_DRAFT', 'Demand Draft / Banker’s Cheque'),
        ('ESCROW', 'HomeQuest Escrow Account'),
    ]

    agreement_number = models.CharField(max_length=64, unique=True, db_index=True)
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='purchases',
        verbose_name="Property"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='property_purchases',
        verbose_name="Buyer Account"
    )
    buyer_name = models.CharField(max_length=150, verbose_name="Buyer Name")
    buyer_email = models.EmailField(verbose_name="Buyer Email")
    buyer_phone = models.CharField(max_length=25, verbose_name="Buyer Phone")
    buyer_address = models.CharField(max_length=255, blank=True, default='', verbose_name="Buyer Address")

    # Financial & Kerala Registration Breakdown
    agreed_price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name="Agreed Sale Price (₹)")
    token_amount = models.DecimalField(max_digits=12, decimal_places=2, default=50000.00, verbose_name="Token / Advance Amount Paid (₹)")
    balance_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name="Remaining Balance Amount (₹)")
    stamp_duty = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Kerala Stamp Duty 8% (₹)")
    registration_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Kerala Registration Fee 2% (₹)")
    total_estimated_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, verbose_name="Total Estimated Consideration (₹)")

    # Payment details
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='UPI')
    transaction_id = models.CharField(max_length=100, blank=True, default='', verbose_name="Transaction / Reference ID")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='TOKEN_PAID')

    # Agreement document content
    agreement_document = models.TextField(blank=True, verbose_name="Legal Sale Agreement Deed")
    settlement_deadline = models.DateField(null=True, blank=True, verbose_name="Registry & Settlement Deadline")
    buyer_signed_at = models.DateTimeField(null=True, blank=True)
    seller_signed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Property Purchases'

    def __str__(self):
        return f"Agreement {self.agreement_number} - {self.property.title} by {self.buyer_name} ({self.status})"

