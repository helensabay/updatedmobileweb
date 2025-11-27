from django.urls import include, path
from django.contrib import admin
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/feedback/', include('feedback.urls')),

     path('api/orders/', include('orders.urls')),  # current working route
    path('orders/', include('orders.urls')),      # optional, add this for /orders/
     path('api/orders/', include('orders.urls')),  # 👈 this is key

    path('api/', include('notifications.urls')),  # ✅ only this one for notifications
    path('api/', include('orders.urls')),
    path('api/', include('api.urls')),  # ✅ must include this
    path('api/', include('catering.urls')),  # now /api/catering-events/ works

    # Redirect the root path to a simple health endpoint to avoid 404s
    path("", RedirectView.as_view(url="/api/health/", permanent=False), name="root"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
        path('api/accounts/', include('accounts.urls')),
    path('api/', include('menu.urls')),

    path("accounts/", include("allauth.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
