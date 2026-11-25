from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from custom_lists.views import ListViewSet
from events.views import EventViewSet
from notes.views import NoteViewSet
from tasks.views import TaskViewSet

from .demo import create_guest, reset_guest
from .models import User
from .serializers import (
    GuestProfileSerializer,
    LoginSerializer,
    PasswordSerializer,
    ProfileSerializer,
    RegisterSerializer,
)


def account(user, code=status.HTTP_200_OK, **details):
    profile = None
    if user.is_authenticated:
        serializer = GuestProfileSerializer if user.is_guest else ProfileSerializer
        profile = serializer(user).data
    return Response({"user": profile, **details}, status=code)


def sign_in(request, user):
    previous = request.user
    login(request, user)
    if getattr(previous, "is_guest", False):
        previous.delete()


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
        details = {"demo_enabled": settings.ORGANIZE_DEMO_ENABLED}
        if request.user.is_authenticated and request.query_params.get("workspace") == "1":
            details["records"] = {
                name: view.serializer_class(
                    view.queryset.filter(owner=request.user), many=True
                ).data
                for name, view in (
                    ("tasks", TaskViewSet),
                    ("events", EventViewSet),
                    ("notes", NoteViewSet),
                    ("lists", ListViewSet),
                )
            }
        return account(request.user, **details)


@method_decorator(csrf_protect, name="dispatch")
class PublicAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class DemoView(PublicAuthView):
    throttle_scope = "demo"

    @transaction.atomic
    def post(self, request):
        if not settings.ORGANIZE_DEMO_ENABLED:
            return Response({"detail": "Demonstração indisponível."}, status=404)
        if request.user.is_authenticated:
            if request.user.is_guest:
                return account(request.user)
            return Response({"detail": "Já existe uma conta ativa."}, status=409)
        guest = create_guest()
        if guest is None:
            return Response({"detail": "Demonstração lotada. Tente mais tarde."}, status=503)
        login(request, guest)
        request.session.set_expiry(guest.guest_expires_at)
        return account(guest, status.HTTP_201_CREATED)


class DemoResetView(APIView):
    def post(self, request):
        if not request.user.is_guest:
            raise PermissionDenied("Esta ação é exclusiva da demonstração.")
        reset_guest(request.user)
        return Response(status=204)


class RegisterView(PublicAuthView):
    @transaction.atomic
    def post(self, request):
        form = RegisterSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        user = save_account(form)
        sign_in(request, user)
        return account(user, status.HTTP_201_CREATED)


class LoginView(PublicAuthView):
    @transaction.atomic
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
        sign_in(request, user)
        return account(user)


class LogoutView(APIView):
    @transaction.atomic
    def post(self, request):
        user = request.user
        logout(request)
        if user.is_guest:
            user.delete()
        return Response(status=204)


class ProfileView(APIView):
    def get(self, request):
        return account(request.user)

    @transaction.atomic
    def patch(self, request):
        user = User.objects.select_for_update().get(pk=request.user.pk)
        serializer = GuestProfileSerializer if user.is_guest else ProfileSerializer
        form = serializer(user, data=request.data, partial=True)
        form.is_valid(raise_exception=True)
        return account(save_account(form))


class PasswordView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @transaction.atomic
    def post(self, request):
        if request.user.is_guest:
            raise PermissionDenied("A demonstração não possui senha.")
        user = User.objects.select_for_update().get(pk=request.user.pk)
        request.user = user
        form = PasswordSerializer(data=request.data, context={"request": request})
        form.is_valid(raise_exception=True)
        user.set_password(form.validated_data["new_password"])
        user.save(update_fields=["password"])
        update_session_auth_hash(request, user)
        return Response(status=204)
