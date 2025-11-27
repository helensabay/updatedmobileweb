from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'  # this must match the folder name


    def ready(self):
        import notifications.signals  # import signals here
