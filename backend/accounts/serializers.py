from django.contrib.auth.hashers import make_password
from api.models import AppUser
from rest_framework import serializers
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)

    class Meta:
        model = AppUser
        fields = ["email", "role", "password", "confirm", "first_name", "last_name"]

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm"]:
            raise serializers.ValidationError({"confirm": "Passwords do not match"})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("confirm", None)
        first = validated_data.pop("first_name")
        last = validated_data.pop("last_name")
        validated_data["name"] = f"{first} {last}"
        user = AppUser(**validated_data)
        user.set_password(password)
        user.save()
        return user
