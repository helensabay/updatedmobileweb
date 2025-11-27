from django.db.models.signals import post_save
from django.dispatch import receiver
from api.models import MenuItem, Notification, AppUser

@receiver(post_save, sender=MenuItem)
def create_menu_notification(sender, instance, created, **kwargs):
    if created:
        user_to_notify = AppUser.objects.first()  # or any logic to pick users
        Notification.objects.create(
            user=user_to_notify,
            title="New Menu Item Added",
            message=f"{instance.name} is now available!",
            type="info"
        )
