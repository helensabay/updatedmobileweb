from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import MenuItem
from notifications.models import Notification  # make sure you have this model

@receiver(post_save, sender=MenuItem)
def notify_menu_change(sender, instance, created, **kwargs):
    title = "New Menu Item" if created else "Menu Updated"
    status = "added" if created else ("sold out" if not instance.available else "updated")
    message = f"{instance.name} was {status}."
    
    Notification.objects.create(title=title, message=message)
