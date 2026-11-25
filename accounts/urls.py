from django.urls import path

from .views import (
    DemoResetView,
    DemoView,
    LoginView,
    LogoutView,
    PasswordView,
    ProfileView,
    RegisterView,
    SessionView,
)

urlpatterns = [
    path("auth/session/", SessionView.as_view()),
    path("auth/demo/", DemoView.as_view()),
    path("auth/demo/reset/", DemoResetView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("auth/password/", PasswordView.as_view()),
    path("profile/", ProfileView.as_view()),
]
