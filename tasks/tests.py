from rest_framework.test import APITestCase

from config.domain_test_support import PersonalRecordContract


class TaskTests(PersonalRecordContract, APITestCase):
    url = "/api/v1/tasks/"
    payload = {"title": "Revisar agenda", "due_date": "2026-11-24"}

    def test_completion_schedule_filter_and_priority_order(self):
        task = self.create(category="Estudo", priority="high", due_time="15:30")
        self.create(title="Outro dia", priority="low", due_date="2026-12-02")
        self.create(title="Descansar", priority="medium")
        detail = f"{self.url}{task['id']}/"
        response = self.client.patch(detail, {"completed": True}, format="json")
        self.assertTrue(response.data["completed"])
        filtered = self.client.get(
            self.url,
            {
                "due_from": "2026-11-24",
                "due_to": "2026-11-24",
                "category": "estudo",
                "completed": "true",
            },
        ).data
        self.assertEqual([record["id"] for record in filtered], [task["id"]])
        ranked = self.client.get(self.url, {"ordering": "-priority"}).data
        self.assertEqual([record["priority"] for record in ranked], ["high", "medium", "low"])
        self.assertEqual(self.client.get(self.url, {"due_from": "invalido"}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {"completed": "talvez"}).status_code, 400)
        rescheduled = self.client.patch(
            detail,
            {"due_date": "2026-12-03", "due_time": None, "completed": False},
            format="json",
        )
        self.assertEqual(rescheduled.data["due_date"], "2026-12-03")
        self.assertFalse(rescheduled.data["completed"])
