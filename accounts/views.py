from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User
from .serializers import (
    LoginSerializer,
    PasswordSerializer,
    ProfileSerializer,
    RegisterSerializer,
)


def account(user, code=status.HTTP_200_OK):
    return Response(
        {"user": ProfileSerializer(user).data if user.is_authenticated else None}, status=code
    )


def save_account(serializer):
    try:
        with transaction.atomic():
            return serializer.save()
    except IntegrityError as exc:
        if getattr(exc.__cause__, "sqlstate", None) == "23505":
            raise serializers.ValidationError({"email": "E-mail já cadastrado."}) from exc
        raise


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return account(request.user)


@method_decorator(csrf_protect, name="dispatch")
class PublicAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RegisterView(PublicAuthView):
    def post(self, request):
        form = RegisterSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        user = save_account(form)
        login(request, user)
        return account(user, status.HTTP_201_CREATED)


class LoginView(PublicAuthView):
    def post(self, request):
        form = LoginSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=form.validated_data["email"].lower(),
            password=form.validated_data["password"],
        )
        if user is None:
            return Response({"detail": "E-mail ou senha incorretos."}, status=400)
        login(request, user)
        return account(user)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=204)


class ProfileView(APIView):
    def get(self, request):
        return account(request.user)

    @transaction.atomic
    def patch(self, request):
        user = User.objects.select_for_update().get(pk=request.user.pk)
        form = ProfileSerializer(user, data=request.data, partial=True)
        form.is_valid(raise_exception=True)
        return account(save_account(form))


class PasswordView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @transaction.atomic
    def post(self, request):
        user = User.objects.select_for_update().get(pk=request.user.pk)
        request.user = user
        form = PasswordSerializer(data=request.data, context={"request": request})
        form.is_valid(raise_exception=True)
        user.set_password(form.validated_data["new_password"])
        user.save(update_fields=["password"])
        update_session_auth_hash(request, user)
        return Response(status=204)
