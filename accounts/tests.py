from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from .models import User


class SessionTests(APITestCase):
    base = "/api/v1/"
    profile = {"name": "Ana Lima", "email": "Ana@example.test", "password": "vento-da-serra#87"}

    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.client.get(self.base + "auth/session/")

    def write(self, path, body=None, method="post"):
        return getattr(self.client, method)(
            self.base + path,
            body or {},
            format="json",
            HTTP_X_CSRFTOKEN=self.client.cookies["csrftoken"].value,
        )

    def register(self):
        result = self.write("auth/register/", self.profile)
        self.assertEqual(result.status_code, 201, result.data)
        return result.data["user"]

    def test_csrf_and_private_cache(self):
        response = self.client.get(self.base + "auth/session/")
        self.assertEqual(response.data, {"user": None})
        self.assertIn("no-store", response["Cache-Control"])
        for path in ("auth/login/", "auth/register/"):
            self.assertEqual(
                self.client.post(self.base + path, self.profile, format="json").status_code, 403
            )
        self.assertEqual(self.client.get(self.base + "profile/").status_code, 403)

    def test_register_login_logout_profile(self):
        account = self.register()
        self.assertEqual(set(account), {"id", "name", "email", "theme"})
        self.assertEqual(account["email"], "ana@example.test")
        self.assertTrue(self.client.cookies["sessionid"]["httponly"])
        self.assertTrue(User.objects.get().check_password(self.profile["password"]))
        self.assertEqual(self.write("auth/logout/").status_code, 204)
        self.assertIsNone(self.client.get(self.base + "auth/session/").data["user"])
        self.assertEqual(
            self.write("auth/login/", {**self.profile, "password": "incorreta"}).status_code,
            400,
        )
        self.assertEqual(self.write("auth/login/", self.profile).status_code, 200)
        self.assertEqual(self.client.get(self.base + "profile/").data["user"], account)

    def test_preferences_and_session_after_password_change(self):
        self.register()
        result = self.write("profile/", {"name": "Ana Maria", "theme": "dark"}, "patch")
        self.assertEqual(result.data["user"]["theme"], "dark")
        self.assertEqual(self.write("profile/", {"theme": "unknown"}, "patch").status_code, 400)
        new = "outra-credencial#57"
        self.assertEqual(
            self.write(
                "auth/password/", {"old_password": "errada", "new_password": new}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.write(
                "auth/password/",
                {"old_password": self.profile["password"], "new_password": new},
            ).status_code,
            204,
        )
        self.assertEqual(
            self.client.get(self.base + "profile/").data["user"]["name"], "Ana Maria"
        )
        self.write("auth/logout/")
        self.assertEqual(self.write("auth/login/", self.profile).status_code, 400)
        self.assertEqual(
            self.write("auth/login/", {**self.profile, "password": new}).status_code, 200
        )

    def test_validate_identity_and_profile_changes(self):
        self.assertEqual(
            self.write("auth/register/", {**self.profile, "password": "123"}).status_code, 400
        )
        self.register()
        for payload in (self.profile, {**self.profile, "email": self.profile["email"].upper()}):
            self.assertEqual(self.write("auth/register/", payload).status_code, 400)
        User.objects.create_user("other@example.test", "outra-conta#75")
        self.assertEqual(
            self.write("profile/", {"email": "OTHER@example.test"}, "patch").status_code, 400
        )
        self.assertEqual(User.objects.count(), 2)

    def test_authenticated_mutations_require_csrf(self):
        self.register()
        for path in ("profile/", "auth/logout/", "auth/password/"):
            method = self.client.patch if path == "profile/" else self.client.post
            self.assertEqual(method(self.base + path, {}, format="json").status_code, 403)

    def test_payload_limit(self):
        with self.settings(DATA_UPLOAD_MAX_MEMORY_SIZE=32):
            self.assertEqual(self.write("auth/register/", self.profile).status_code, 413)

    def test_stale_editor_cannot_save_into_a_different_active_account(self):
        first = self.register()
        second = User.objects.create_user(
            "segunda@example.test", "vento-da-serra#91", first_name="Beatriz"
        )
        self.client.force_login(second)
        response = self.client.patch(
            self.base + "profile/",
            {"name": "Outra pessoa"},
            format="json",
            HTTP_X_ORGANIZE_USER=str(first["id"]),
            HTTP_X_CSRFTOKEN=self.client.cookies["csrftoken"].value,
        )
        self.assertEqual(response.status_code, 409)
        second.refresh_from_db()
        self.assertEqual(second.first_name, "Beatriz")

    def test_invalid_auth_attempts_are_rate_limited(self):
        self.assertEqual(self.write("auth/login/").status_code, 400)
        for _ in range(29):
            self.write("auth/login/")
        self.assertEqual(self.write("auth/login/").status_code, 429)
