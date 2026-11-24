from rest_framework.test import APITestCase

from config.domain_test_support import PersonalRecordContract


class NoteTests(PersonalRecordContract, APITestCase):
    url = "/api/v1/notes/"
    payload = {"title": "Referências"}

    def test_pin_and_content_search(self):
        pinned = self.create(content="Bibliografia do semestre", pinned=True)
        self.create(title="Receita")
        self.assertEqual(self.client.get(self.url).data[0]["id"], pinned["id"])
        self.assertEqual(self.client.get(self.url, {"search": "semestre"}).data, [pinned])
