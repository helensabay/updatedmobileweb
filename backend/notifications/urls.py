# notifications/urls.py
from django.urls import path
from . import views  # ✅ Correct import

urlpatterns = [
    path('notifications/', views.notifications_list, name='notifications_list'),
]
