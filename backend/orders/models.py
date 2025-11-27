from django.apps import AppConfig
from django.db import models

class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'
class Offer(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    required_points = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='offers/', null=True, blank=True)
    available = models.BooleanField(default=True)  # optional

    def __str__(self):
        return self.name