from rest_framework import serializers
from api.models import CateringEvent

class CateringEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CateringEvent
        fields = '__all__'
