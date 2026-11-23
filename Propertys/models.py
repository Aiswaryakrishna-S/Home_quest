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


# =====================================================================
# PROPERTY TOUR & VISIT SCHEDULE MANAGEMENT
# =====================================================================

DEFAULT_BUYER_CHECKLIST = {
    "government_id": {"label": "Government ID Proof (Aadhaar / Passport / Voter ID)", "checked": False},
    "financing_readiness": {"label": "Bank Loan Pre-approval / Financing Documents", "checked": False},
    "inspection_questions": {"label": "Structural & Title Inquiry Questions Prepared", "checked": False},
    "measurement_tools": {"label": "Camera / Measuring Tools for Inspection", "checked": False},
    "route_mapped": {"label": "GPS Route & Driving Directions Confirmed", "checked": False},
}

DEFAULT_SELLER_CHECKLIST = {
    "keys_available": {"label": "Main Gate & Room Keys Available and Tested", "checked": False},
    "premises_cleaned": {"label": "Property Cleaned & Rooms Well-Illuminated", "checked": False},
    "utilities_functional": {"label": "Electricity, Water Supply & Plumbing Functional", "checked": False},
    "title_copies_ready": {"label": "Title Deed, Tax Receipts & Approvals Ready for Inspection", "checked": False},
    "tenant_notified": {"label": "Current Occupants / Security Notified in Advance", "checked": False},
}


class PropertyTourSchedule(models.Model):
    """
    Dedicated visit calendar for tracking upcoming, completed, and cancelled tours,
    supporting one-click rescheduling and visit-readiness checklists.
    """
    class TourStatus(models.TextChoices):
        UPCOMING = 'UPCOMING', 'Upcoming'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        RESCHEDULED = 'RESCHEDULED', 'Rescheduled'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    TIME_SLOT_CHOICES = [
        ('09:00 AM - 10:00 AM', 'Morning: 09:00 AM - 10:00 AM'),
        ('10:00 AM - 11:00 AM', 'Morning: 10:00 AM - 11:00 AM'),
        ('11:00 AM - 12:00 PM', 'Morning: 11:00 AM - 12:00 PM'),
        ('02:00 PM - 03:00 PM', 'Afternoon: 02:00 PM - 03:00 PM'),
        ('03:00 PM - 04:00 PM', 'Afternoon: 03:00 PM - 04:00 PM'),
        ('04:00 PM - 05:00 PM', 'Evening: 04:00 PM - 05:00 PM'),
        ('05:00 PM - 06:00 PM', 'Evening: 05:00 PM - 06:00 PM'),
    ]

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='tour_schedules',
        verbose_name="Property"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='booked_tours',
        verbose_name="Buyer"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_tours',
        verbose_name="Host / Seller"
    )

    # Visitor credentials
    visitor_name = models.CharField(max_length=150, verbose_name="Visitor Name")
    visitor_phone = models.CharField(max_length=25, verbose_name="Visitor Phone")
    visitor_email = models.EmailField(verbose_name="Visitor Email")

    # Tour scheduling details
    scheduled_date = models.DateField(verbose_name="Scheduled Tour Date")
    time_slot = models.CharField(max_length=50, choices=TIME_SLOT_CHOICES, default='10:00 AM - 11:00 AM')
    status = models.CharField(max_length=20, choices=TourStatus.choices, default=TourStatus.UPCOMING)

    # Rescheduling tracking (one-click rescheduling support)
    rescheduled_count = models.PositiveIntegerField(default=0)
    previous_date = models.DateField(null=True, blank=True)
    previous_time_slot = models.CharField(max_length=50, blank=True, default='')
    reschedule_reason = models.TextField(blank=True, default='')

    # Notes & Special requests
    buyer_notes = models.TextField(blank=True, default='')
    seller_notes = models.TextField(blank=True, default='')

    # Interactive Visit-Readiness Checklists
    buyer_checklist = models.JSONField(default=dict, blank=True)
    seller_checklist = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_date', 'time_slot']
        verbose_name = 'Property Tour Schedule'
        verbose_name_plural = 'Property Tour Schedules'

    def save(self, *args, **kwargs):
        # Initialize default checklists if empty
        if not self.buyer_checklist:
            self.buyer_checklist = dict(DEFAULT_BUYER_CHECKLIST)
        if not self.seller_checklist:
            self.seller_checklist = dict(DEFAULT_SELLER_CHECKLIST)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Tour on {self.scheduled_date} ({self.time_slot}) for {self.property.title} - {self.status}"


