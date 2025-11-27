from rest_framework import serializers
from api.models import Order, OrderItem
from menu.serializers import MenuItemSerializer
from .utils import map_order_status  # if you put it in utils.py


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['menu_item', 'quantity', 'price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()  # override status

    class Meta:
        model = Order
        fields = [
            'id',
            'user',
            'customer_name',
            'order_type',
            'status',  # will now return mapped status
            'payment_method',
            'total_amount',
            'pickup_time',
            'created_at',
            'items',
        ]
        read_only_fields = ['user', 'status', 'created_at']

    def get_status(self, obj):
        return map_order_status(obj.status)
from rest_framework import serializers

class CreditPointsSerializer(serializers.Serializer):
    credit_points = serializers.DecimalField(max_digits=10, decimal_places=2)
