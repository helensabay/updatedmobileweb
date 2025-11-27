from django.db import models
from uuid import uuid4
from django.conf import settings

AppUser = settings.AUTH_USER_MODEL  # your user model

class CateringEvent(models.Model):
    STATUS_SCHEDULED = "scheduled"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    name = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True, null=True)
    contact_name = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=64, blank=True)
    contact_email = models.EmailField(blank=True, null=True)
    event_date = models.DateField()
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True)
    guest_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    notes = models.TextField(blank=True)
    estimated_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    order_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deposit_paid = models.BooleanField(default=False)
    payment_status = models.CharField(max_length=32, default="unpaid")
    deleted_at = models.DateTimeField(blank=True, null=True)
    deleted_by = models.ForeignKey(AppUser, on_delete=models.SET_NULL, related_name="catering_events_deleted", null=True, blank=True)
    created_by = models.ForeignKey(AppUser, on_delete=models.SET_NULL, related_name="catering_events", null=True, blank=True)
    updated_by = models.ForeignKey(AppUser, on_delete=models.SET_NULL, related_name="catering_events_updated", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catering_event"
        indexes = [
            models.Index(fields=["event_date", "status"]),
            models.Index(fields=["client_name"]),
        ]

    def __str__(self):
        return f"{self.name} on {self.event_date}" if self.event_date else self.name


class CateringEventItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    event = models.ForeignKey(CateringEvent, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey('api.MenuItem', on_delete=models.SET_NULL, null=True, blank=True, related_name="catering_items")
    name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catering_event_item"
        indexes = [
            models.Index(fields=["event"]),
        ]

    @property
    def total_price(self):
        from decimal import Decimal
        return (Decimal(self.quantity or 0) * Decimal(self.unit_price or 0)).quantize(Decimal("0.01"))
