from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from api.models import Notification
from api.models import MenuItem  # assuming MenuItem is in api.models

User = get_user_model()

# MenuItem created or updated
@receiver(post_save, sender=MenuItem)
def menuitem_post_save(sender, instance, created, **kwargs):
    if created:
        # New menu item added
        for user in User.objects.all():
            Notification.objects.create(
                user=user,
                title="New Menu Item Added",
                message=f"{instance.name} is now available!",
                type="new"
            )
    else:
        # Item sold out
        if instance.quantity == 0:
            for user in User.objects.all():
                Notification.objects.create(
                    user=user,
                    title="Menu Item Sold Out",
                    message=f"{instance.name} is now sold out!",
                    type="soldout"
                )

# MenuItem deleted
@receiver(post_delete, sender=MenuItem)
def menuitem_post_delete(sender, instance, **kwargs):
    for user in User.objects.all():
        Notification.objects.create(
            user=user,
            title="Menu Item Removed",
            message=f"{instance.name} has been removed from the menu.",
            type="deleted"
        )
