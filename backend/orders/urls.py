from django.urls import path
from . import views

urlpatterns = [
    path('create_order/', views.create_order, name='create-order'),
    path('', views.list_orders, name='list-orders'),
    path('user-credit-points/', views.user_credit_points, name='user-credit-points'),
    path('<str:order_number>/gcash_link/', views.gcash_link, name='gcash-link'),
    path('<str:order_number>/status/', views.order_status, name='order-status'),
    path('<str:order_number>/', views.get_order, name='get-order'),
    path('orders/<int:order_id>/gcash_qr/', views.fetch_gcash_qr, name='fetch_gcash_qr'),
    path('orders/<int:order_id>/gcash_qr/', views.fetch_gcash_qr, name='fetch_gcash_qr'),

    path('<str:order_number>/confirm_payment/', views.confirm_payment, name='confirm-payment'),
]
