import uuid
from django.db import models

class MenuCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'menu_category'  # Use existing DB table
        managed = False  # Don't let Django modify this table

    def __str__(self):
        return self.name

class MenuItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)  # or ForeignKey(MenuCategory)
    image = models.ImageField(upload_to='menu_images/', blank=True, null=True)
    available = models.BooleanField(default=True)
    archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'menu_item'  # Use existing DB table
        managed = False  # Don't let Django modify this table

    def __str__(self):
        return self.name
