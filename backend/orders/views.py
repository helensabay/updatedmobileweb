from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal, ROUND_DOWN

from rest_framework import status
from api.models import Order, OrderItem
from .serializers import CreditPointsSerializer  
from rest_framework import serializers
from decimal import Decimal

from django.http import JsonResponse
from api.models import Order, OrderItem, MenuItem
from .serializers import OrderSerializer
from notifications.models import Notification
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone as dj_tz
import uuid
from menu.models import MenuItem  # adjust import to your menu app

# ------------------------------
# ✅ CREATE ORDER
# ------------------------------
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
import uuid
from api.models import Order, OrderItem, MenuItem
# Serializer for credit points
class CreditPointsSerializer(serializers.Serializer):
    credit_points = serializers.DecimalField(max_digits=10, decimal_places=2)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_status(request, order_number):  
    try:
        # Use 'name' from the user model
        order = Order.objects.get(
            order_number=order_number,
            customer_name=request.user.name   # FIXED
        )

        items = [
            {
                "name": item.item_name,
                "quantity": item.quantity,
                "price": float(item.price),
            }
            for item in order.items.all()
        ]

        return JsonResponse({
            "success": True,
            "status": order.status,
            "items": items
        })

    except Order.DoesNotExist:
        return JsonResponse(
            {"success": False, "message": "Order not found or not yours"},
            status=404
        )

# api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import traceback
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    user = request.user
    data = request.data

    try:
        # 1️⃣ Parse credit points requested
        requested_points = Decimal(data.get('credit_points_used', 0)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)

        # 2️⃣ Fetch Paid orders to calculate earned points
        paid_orders = Order.objects.filter(placed_by=user, status='Paid')

        total_earned_points = sum(
            (order.total_amount * Decimal('0.01')).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            for order in paid_orders
        )

        total_used_points = sum(
            (order.credit_points_used or Decimal('0.0')).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            for order in paid_orders
        )

        # 3️⃣ Compute available points
        available_points = max(total_earned_points - total_used_points, Decimal('0.0'))

        # 4️⃣ Clamp requested points to available points and order total
        order_total = Decimal(data['total_amount']).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
        requested_points = min(requested_points, available_points, order_total)

        # 5️⃣ Check if requested points exceed available points
        if requested_points > available_points:
            return Response(
                {'success': False, 'message': 'Insufficient backend points'},
                status=400
            )

        # 6️⃣ Generate unique order number
        order_number = str(uuid.uuid4())[:12]

        # 7️⃣ Create the order
        order = Order.objects.create(
            order_number=order_number,
            placed_by=user,
            total_amount=order_total,
            credit_points_used=requested_points,
            status='Pending',
            customer_name=data['customer_name'],
            promised_time=data['promised_time'],
            order_type=data.get('order_type', 'pickup')
        )

        # 8️⃣ Create order items
        for item in data.get('items', []):
            OrderItem.objects.create(
                order=order,
                item_name=item['name'],
                price=Decimal(item['price']).quantize(Decimal('0.01'), rounding=ROUND_DOWN),
                quantity=int(item['quantity']),
                menu_item_id=item['menu_item_id'],
                size=item.get('size'),
                customize=item.get('customize')
            )

        return Response({'success': True, 'order_number': order.order_number})

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_orders(request):
    user = request.user
    customer_name = user.get_full_name() or user.username  # fallback

    orders = Order.objects.filter(customer_name=customer_name)

    if not orders.exists():
        return Response({"orders": []}, status=200)

    serializer = OrderSerializer(orders, many=True)
    return Response({"orders": serializer.data}, status=200)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_credit_points(request):
    user = request.user
    paid_orders = Order.objects.filter(placed_by=user, status='Paid')
    
    total_earned_points = sum(
        ((order.total_amount + (order.credit_points_used or 0)) * Decimal('0.01')).quantize(Decimal('0.01'))
        for order in paid_orders
    )
    total_used_points = sum(
        (order.credit_points_used or Decimal('0.0')).quantize(Decimal('0.01'))
        for order in paid_orders
    )
    
    credit_points = max(total_earned_points - total_used_points, Decimal('0.0'))
    serializer = CreditPointsSerializer({'credit_points': credit_points})
    return Response(serializer.data)

@permission_classes([AllowAny])
def get_order(request, order_number):
    try:
        order = Order.objects.get(order_number=order_number)
        items = [
            {
                "name": oi.item_name,
                "price": float(oi.price),
                "quantity": oi.quantity,
            } for oi in order.orderitem_set.all()
        ]
        return Response({
            "success": True,
            "order_number": order.order_number,
            "order_type": order.order_type,
            "total_amount": float(order.total_amount),
            "promised_time": order.promised_time,
            "status": order.status,
            "items": items
        })
    except Order.DoesNotExist:
        return Response({"success": False, "message": "Order not found"}, status=404)

# ------------------------------
# ✅ LIST ALL ORDERS FOR USER
# ------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_orders(request):
    orders = Order.objects.filter(placed_by=request.user).order_by('-created_at')
    orders_data = []

    for order in orders:
        items = [
            {
                "name": item.item_name,
                "quantity": item.quantity,
                "price": float(item.price),
                "size": getattr(item, "size", None),
                "customize": getattr(item, "customize", None),
                "image": getattr(item, "image", None),
            } 
            for item in order.items.all()
        ]

        orders_data.append({
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "items": items,
        })

    return Response({"success": True, "orders": orders_data})

# api/views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fetch_user_orders(request):
    user_name = request.user.name
    # Use icontains to include orders with empty/mismatched names
    orders = Order.objects.filter(customer_name__icontains=user_name).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response({"success": True, "orders": serializer.data})
# ------------------------------
# ✅ GENERATE GCASH PAYMENT LINK
# ------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def gcash_link(request, order_number):
    try:
        order = Order.objects.get(order_number=order_number)
        gcash_url = f"https://pay.gcash.com/pay?amount={order.total_amount}&note=Order{order.order_number}"
        return JsonResponse({"success": True, "gcash_url": gcash_url})
    except Order.DoesNotExist:
        return JsonResponse({"success": False, "message": "Order not found"}, status=404)

# ------------------------------
# ✅ CONFIRM PAYMENT
# ------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, order_number):
    try:
        data = request.data
        method = data.get('method', None)
        order = Order.objects.get(order_number=order_number)

        order.payment_method = method
        order.status = "Paid"
        order.save()

        # Add 1% of total_amount to user's credit points
        user = order.placed_by
        earned_points = order.total_amount * Decimal('0.01')
        
        # Ensure user has credit_points field
        if not hasattr(user, 'credit_points'):
            user.credit_points = Decimal('0.0')

        user.credit_points += earned_points
        user.save()

        return Response({"success": True, "message": "Payment confirmed", "earned_points": float(earned_points)})

    except Order.DoesNotExist:
        return Response({"success": False, "message": "Order not found"}, status=404)
@api_view(['GET'])
@permission_classes([AllowAny])
def gcash_payment_qr(request, order_number):
    try:
        order = Order.objects.get(order_number=order_number)
        # Replace this with your actual GCash payment URL or QR API
        gcash_qr_url = f"https://pay.gcash.com/qr?amount={order.total_amount}&note=Order{order.order_number}"
        return Response({
            "success": True,
            "qr_url": gcash_qr_url,
            "total_amount": float(order.total_amount)
        })
    except Order.DoesNotExist:
        return Response({"success": False, "message": "Order not found"}, status=404)
@api_view(['GET'])
@permission_classes([AllowAny])
def fetch_gcash_qr(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
        qr_url = f"https://pay.gcash.com/pay?amount={order.total_amount}&note=Order{order.order_number}"
        return Response({"success": True, "qr_url": qr_url})
    except Order.DoesNotExist:
        return Response({"success": False, "message": "Order not found"})
