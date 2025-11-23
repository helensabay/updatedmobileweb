from django.db import models

class Notification(models.Model):
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, default="new")  # "new", "soldout", etc.
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return self.title
