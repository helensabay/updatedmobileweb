from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CateringEventViewSet

router = DefaultRouter()
router.register(r'catering-events', CateringEventViewSet, basename='catering-events')

urlpatterns = [
    path('', include(router.urls)),
]
