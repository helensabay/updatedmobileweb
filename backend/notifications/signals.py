from django.db.models.signals import post_save
from django.dispatch import receiver
from api.models import MenuItem  # your MenuItem model
from .models import Notification

@receiver(post_save, sender=MenuItem)
def create_menu_notification(sender, instance, created, **kwargs):
    if created:  # Only create notification for new items
        Notification.objects.create(
            title="New Menu Item Added",
            message=f"{instance.name} is now available!",
            type="new"
        )
