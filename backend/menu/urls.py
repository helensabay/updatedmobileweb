from django.urls import path
from . import views

urlpatterns = [
    path('menu-items/', views.menu_items, name='menu_items'),
    path('menu-items/<str:item_id>/', views.menu_item_detail, name='menu_item_detail'),
    path('menu-items/<str:item_id>/availability/', views.menu_item_availability, name='menu_item_availability'),
    path('menu/categories/', views.categories_list, name='menu_categories'),
    path('menu-items/<str:item_id>/image/', views.menu_item_image, name='menu_item_image'),
]
