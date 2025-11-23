from rest_framework import serializers
from .models import MenuItem

class MenuItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(format='hex_verbose', required=False)

    class Meta:
        model = MenuItem
        fields = '__all__'
