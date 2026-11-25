from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class ProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", max_length=150)

    class Meta:
        model = User
        fields = ["id", "name", "email", "theme"]
        read_only_fields = ["id"]
        extra_kwargs = {"email": {"required": True, "allow_null": False}}

    def validate_email(self, value):
        return value.strip().lower()


class GuestProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "theme", "is_guest"]
        read_only_fields = ["id", "is_guest"]

    def to_internal_value(self, data):
        if hasattr(data, "keys") and set(data) - {"theme"}:
            raise serializers.ValidationError(
                {"detail": "Visitantes podem alterar apenas o tema."}
            )
        return super().to_internal_value(data)


class RegisterSerializer(ProfileSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=256)

    class Meta(ProfileSerializer.Meta):
        fields = [*ProfileSerializer.Meta.fields, "password"]

    def validate(self, attrs):
        validate_password(
            attrs["password"], User(first_name=attrs["first_name"], email=attrs["email"])
        )
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(trim_whitespace=False, max_length=256)


class PasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(trim_whitespace=False, max_length=256)
    new_password = serializers.CharField(trim_whitespace=False, max_length=256)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Senha atual incorreta."})
        validate_password(attrs["new_password"], user)
        return attrs
