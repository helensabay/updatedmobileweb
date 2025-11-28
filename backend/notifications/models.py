from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from api.models import Notification
from django.contrib.auth import get_user_model
from feedback.models import Feedback

User = get_user_model()

@receiver(post_save, sender=Feedback)
def feedback_post_save(sender, instance, created, **kwargs):
    if created:
        for user in User.objects.all():  # Or just the relevant user
            Notification.objects.create(
                user=user,
                title="New Feedback",
                message=f"New feedback received: {instance.message}",
                type="new"
            )
