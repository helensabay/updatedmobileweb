from django.urls import path
from .views import RegisterView, LoginView, ProfileView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, LoginView, ProfileView, change_password
from .views import RegisterView, LoginView, ProfileView, change_password, update_avatar

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # JWT login
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # JWT refresh
    path('update-avatar/', update_avatar, name='update-avatar'),

       path('change-password/', change_password, name='change-password'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
