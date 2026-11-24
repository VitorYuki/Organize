from django.contrib.auth import get_user_model


class PersonalRecordContract:
    """Exercise the same public CRUD and access rules for every resource type."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.owner = get_user_model().objects.create_user(email="owner@example.test")
        cls.other = get_user_model().objects.create_user(email="other@example.test")

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.owner)

    def create(self, **values):
        response = self.client.post(self.url, {**self.payload, **values}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_private_crud_and_ownership(self):
        record = self.create(owner=self.other.pk)
        detail = f"{self.url}{record['id']}/"
        self.assertNotIn("owner", record)
        self.assertIn("created_at", record)
        self.assertIn("updated_at", record)
        self.assertEqual(self.client.get(detail).data["title"], self.payload["title"])
        self.assertEqual(len(self.client.get(self.url).data), 1)

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).data, [])
        self.assertEqual(self.client.get(detail).status_code, 404)
        self.assertEqual(
            self.client.patch(detail, {"title": "Troca"}, format="json").status_code, 404
        )
        self.assertEqual(self.client.delete(detail).status_code, 404)

        self.client.force_authenticate(self.owner)
        updated = self.client.patch(detail, {"title": "Atualização"}, format="json")
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["title"], "Atualização")
        self.assertEqual(self.client.delete(detail).status_code, 204)
        self.assertEqual(self.client.get(detail).status_code, 404)

    def test_rejects_blank_title_and_anonymous_traffic(self):
        self.assertEqual(
            self.client.post(
                self.url, {**self.payload, "title": "  "}, format="json"
            ).status_code,
            400,
        )
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(
            self.client.post(self.url, self.payload, format="json").status_code, 403
        )
