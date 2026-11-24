from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from config.domain_test_support import PersonalRecordContract

from .models import Event


class EventTests(PersonalRecordContract, APITestCase):
    url = "/api/v1/events/"
    payload = {
        "title": "Dia de estudo",
        "starts_at": "2026-11-24T00:00:00-03:00",
        "ends_at": "2026-11-25T00:00:00-03:00",
        "all_day": True,
    }

    def test_exclusive_day_bounds_include_overnight_events(self):
        event = self.create()
        inside = self.client.get(
            self.url, {"from": "2026-11-24T12:00:00Z", "to": "2026-11-24T14:00:00Z"}
        )
        self.assertEqual([record["id"] for record in inside.data], [event["id"]])
        after = self.client.get(self.url, {"from": self.payload["ends_at"]})
        self.assertEqual(after.data, [])
        before = self.client.get(self.url, {"to": self.payload["starts_at"]})
        self.assertEqual(before.data, [])
        self.assertEqual(self.client.get(self.url, {"from": "ontem"}).status_code, 400)

    def test_validates_partial_edits_end_time_and_local_midnight(self):
        event = self.create()
        detail = f"{self.url}{event['id']}/"
        for field, value in (
            ("ends_at", "2026-11-23T14:00:00Z"),
            ("ends_at", "2026-11-26T00:00:00"),
            ("ends_at", "2026-11-26T12:00:00Z"),
        ):
            with self.subTest(value=value):
                self.assertEqual(
                    self.client.patch(detail, {field: value}, format="json").status_code, 400
                )
        updated = self.client.patch(
            detail, {"all_day": False, "ends_at": "2026-11-26T12:00:00Z"}, format="json"
        )
        self.assertEqual(updated.status_code, 200)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Event.objects.filter(pk=event["id"]).update(ends_at=self.payload["starts_at"])
