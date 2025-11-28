from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from api.models import Notification
from .models import Feedback  # your feedback model

User = get_user_model()

@receiver(post_save, sender=Feedback)
def feedback_post_save(sender, instance, created, **kwargs):
    if created:
        # Notify admin or all users
        for user in User.objects.all():  # Or choose specific users
            Notification.objects.create(
                user=user,
                title="New Feedback Received",
                message=f"New feedback: {instance.message}",
                type="new"
            )
