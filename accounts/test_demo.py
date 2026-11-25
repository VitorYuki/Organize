from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from io import StringIO
from threading import Barrier
from unittest.mock import patch

from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.core.management import call_command
from django.db import connections
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from custom_lists.models import ListItem
from tasks.models import Task

from .demo import create_guest
from .models import User


@override_settings(ORGANIZE_DEMO_ENABLED=True)
class DemoTests(APITestCase):
    base = "/api/v1/"

    def setUp(self):
        cache.clear()
        self.client = self.browser()

    def browser(self):
        client = APIClient(enforce_csrf_checks=True)
        client.get(self.base + "auth/session/")
        return client

    def write(self, path, body=None, *, client=None, method="post", **headers):
        client = client or self.client
        return getattr(client, method)(
            self.base + path,
            body or {},
            format="json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
            **headers,
        )

    def start(self, client=None):
        response = self.write("auth/demo/", client=client)
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["user"]

    def test_start_is_csrf_protected_and_seeds_relative_data(self):
        self.assertEqual(self.client.post(self.base + "auth/demo/").status_code, 403)
        profile = self.start()
        self.assertEqual(set(profile), {"id", "name", "theme", "is_guest"})
        self.assertEqual(profile["name"], "Visitante")
        self.assertTrue(profile["is_guest"])
        guest = User.objects.get(pk=profile["id"])
        self.assertIsNone(guest.email)
        self.assertFalse(guest.is_staff or guest.is_superuser or guest.has_usable_password())
        self.assertTrue(self.client.cookies["sessionid"]["httponly"])
        self.assertEqual(self.client.session.get_expiry_date(), guest.guest_expires_at)
        self.assertEqual(self.client.get(self.base + "auth/session/").data["user"], profile)
        self.assertEqual(self.write("auth/demo/").data["user"], profile)
        self.assertEqual(User.objects.count(), 1)
        for path, count in (("tasks/", 5), ("events/", 3), ("notes/", 2), ("lists/", 3)):
            self.assertEqual(len(self.client.get(self.base + path).data), count)
        self.assertTrue(
            Task.objects.filter(owner=guest, due_date=timezone.localdate()).exists()
        )

    def test_disabled_mode_rejects_creation_and_revokes_guest_access(self):
        self.start()
        with self.settings(ORGANIZE_DEMO_ENABLED=False):
            session = self.client.get(self.base + "auth/session/")
            self.assertEqual(session.data, {"user": None, "demo_enabled": False})
            self.assertEqual(self.client.get(self.base + "tasks/").status_code, 403)
            self.assertEqual(self.write("auth/demo/").status_code, 404)

    def test_guest_profile_only_accepts_theme(self):
        self.start()
        response = self.write("profile/", {"theme": "dark"}, method="patch")
        self.assertEqual(response.data["user"]["theme"], "dark")
        for field in ("name", "email", "is_guest", "is_staff"):
            self.assertEqual(
                self.write("profile/", {field: "x"}, method="patch").status_code, 400
            )
        self.assertEqual(self.write("auth/password/").status_code, 403)

    def test_guest_and_personal_data_are_isolated_in_both_directions(self):
        first = self.start()
        other = self.browser()
        second = self.start(other)
        self.assertNotEqual(first["id"], second["id"])
        personal = self.browser()
        owner = User.objects.create_user("pessoal@example.test", "uma-senha-forte#49")
        personal.force_login(owner)
        record = Task.objects.create(
            owner=owner, title="Tarefa privada", due_date=timezone.localdate()
        )
        first_task = self.client.get(self.base + "tasks/").data[0]["id"]
        first_list = self.client.get(self.base + "lists/").data[0]
        for client in (other, personal):
            self.assertEqual(client.get(f"{self.base}tasks/{first_task}/").status_code, 404)
            for method in ("patch", "delete"):
                self.assertEqual(
                    self.write(
                        f"tasks/{first_task}/", client=client, method=method
                    ).status_code,
                    404,
                )
            self.assertEqual(
                self.write(
                    f"lists/{first_list['id']}/items/", {"title": "Teste"}, client=client
                ).status_code,
                404,
            )
        self.assertEqual(self.client.get(f"{self.base}tasks/{record.id}/").status_code, 404)
        self.assertEqual(self.write("auth/demo/reset/", client=personal).status_code, 403)
        self.assertEqual(self.write("auth/demo/", client=personal).status_code, 409)
        self.assertEqual(personal.get(self.base + "auth/session/").data["user"]["id"], owner.id)

    def test_reset_and_logout_only_remove_current_guest_data(self):
        guest = self.start()
        other = self.browser()
        second = self.start(other)
        self.write("profile/", {"theme": "dark"}, method="patch")
        custom = {"title": "Lembrete próprio", "due_date": timezone.localdate().isoformat()}
        created = self.write("tasks/", custom).data["id"]
        self.assertEqual(self.write("tasks/", custom, client=other).status_code, 201)
        self.assertEqual(self.write("auth/demo/reset/").status_code, 204)
        self.assertFalse(Task.objects.filter(pk=created).exists())
        self.assertEqual(Task.objects.filter(owner_id=guest["id"]).count(), 5)
        self.assertEqual(Task.objects.filter(owner_id=second["id"]).count(), 6)
        self.assertEqual(self.client.get(self.base + "profile/").data["user"]["theme"], "dark")
        self.assertEqual(self.write("auth/logout/").status_code, 204)
        self.assertFalse(User.objects.filter(pk=guest["id"]).exists())
        self.assertFalse(ListItem.objects.filter(collection__owner_id=guest["id"]).exists())
        self.assertEqual(self.client.get(self.base + "tasks/").status_code, 403)
        self.assertEqual(
            other.get(self.base + "auth/session/").data["user"]["id"], second["id"]
        )

    def test_registration_replaces_guest_with_an_empty_personal_account(self):
        guest = self.start()
        response = self.write(
            "auth/register/",
            {
                "name": "Beatriz Lima",
                "email": "beatriz@example.test",
                "password": "serra-verde#2026",
            },
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["user"]["email"], "beatriz@example.test")
        self.assertFalse(User.objects.filter(pk=guest["id"]).exists())
        self.assertEqual(self.client.get(self.base + "tasks/").data, [])
        self.assertNotIn("_session_expiry", self.client.session)

    def test_failed_reset_keeps_previous_records(self):
        guest = self.start()
        before = list(Task.objects.filter(owner_id=guest["id"]).values_list("id", flat=True))
        with patch("accounts.demo.seed_guest", side_effect=RuntimeError("Injeção de falha")):
            with self.assertRaises(RuntimeError):
                self.write("auth/demo/reset/")
        self.assertEqual(
            list(Task.objects.filter(owner_id=guest["id"]).values_list("id", flat=True)), before
        )

    def test_expired_account_is_denied_and_cleanup_cascades(self):
        expired = self.start()
        expired_key = self.client.session.session_key
        active = self.start(self.browser())
        yesterday = timezone.now() - timedelta(days=1)
        User.objects.filter(pk=expired["id"]).update(guest_expires_at=yesterday)
        self.assertEqual(self.client.get(self.base + "tasks/").status_code, 403)
        stale_session = Session.objects.create(session_key="obsolete", expire_date=yesterday)
        call_command("cleanup_demo", stdout=StringIO())
        self.assertFalse(User.objects.filter(pk=expired["id"]).exists())
        self.assertFalse(Task.objects.filter(owner_id=expired["id"]).exists())
        self.assertFalse(
            Session.objects.filter(pk__in=[expired_key, stale_session.pk]).exists()
        )
        self.assertTrue(User.objects.filter(pk=active["id"]).exists())

    @override_settings(DEMO_MAX_ACCOUNTS=1, DEMO_RECORD_LIMIT=6, DEMO_ITEM_LIMIT=8)
    def test_account_and_storage_limits(self):
        self.start()
        self.assertEqual(self.write("auth/demo/", client=self.browser()).status_code, 503)
        task = {"title": "Extra", "due_date": timezone.localdate().isoformat()}
        self.assertEqual(self.write("tasks/", task).status_code, 201)
        self.assertEqual(self.write("tasks/", task).status_code, 400)
        list_id = self.client.get(self.base + "lists/").data[0]["id"]
        path = f"lists/{list_id}/items/"
        self.assertEqual(self.write(path, {"title": "Extra"}).status_code, 201)
        self.assertEqual(self.write(path, {"title": "Extra"}).status_code, 400)

    @override_settings(DEMO_MAX_ACCOUNTS=0)
    def test_anonymous_demo_creation_is_rate_limited(self):
        for _ in range(10):
            self.assertEqual(self.write("auth/demo/").status_code, 503)
        self.assertEqual(self.write("auth/demo/").status_code, 429)


@override_settings(DEMO_MAX_ACCOUNTS=1)
class DemoCapacityTests(TransactionTestCase):
    def test_simultaneous_starts_respect_shared_capacity(self):
        ready = Barrier(2, timeout=5)

        def attempt():
            try:
                ready.wait()
                return create_guest() is not None
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = [pool.submit(attempt) for _ in range(2)]
            self.assertCountEqual([call.result(timeout=10) for call in results], [True, False])
        self.assertEqual(User.objects.filter(guest_expires_at__isnull=False).count(), 1)
