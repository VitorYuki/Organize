from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.contrib.auth import get_user_model
from django.db import connections
from rest_framework.test import APIClient, APITestCase, APITransactionTestCase

from config.domain_test_support import PersonalRecordContract

from .models import CustomList


class ListTests(PersonalRecordContract, APITestCase):
    url = "/api/v1/lists/"
    payload = {"title": "Compras", "icon": "basket", "color": "rose"}

    def test_item_crud_and_idempotent_reordering(self):
        collection = self.create()
        detail = f"{self.url}{collection['id']}/"
        items = f"{detail}items/"
        first = self.client.post(items, {"title": "Café"}, format="json")
        second = self.client.post(items, {"title": "Açúcar"}, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        first_id, second_id = first.data["id"], second.data["id"]
        change = self.client.patch(
            f"{items}{first_id}/", {"completed": True, "title": "Café em grãos"}, format="json"
        )
        self.assertEqual(change.data["title"], "Café em grãos")
        self.assertTrue(change.data["completed"])
        order = [second_id, first_id]
        for _attempt in range(2):
            ranked = self.client.put(f"{items}reorder/", {"ids": order}, format="json")
            self.assertEqual(ranked.status_code, 200)
            self.assertEqual([item["id"] for item in ranked.data], order)
        self.assertEqual(
            [item["position"] for item in self.client.get(detail).data["items"]], [0, 1]
        )
        self.assertEqual(self.client.delete(f"{items}{first_id}/").status_code, 204)
        self.assertEqual(self.client.get(items).data[0]["id"], second_id)

    def test_nested_records_are_scoped_to_list_and_owner(self):
        list_id = self.create()["id"]
        items = f"{self.url}{list_id}/items/"
        first_id = self.client.post(items, {"title": "Café"}, format="json").data["id"]
        second_id = self.client.post(items, {"title": "Chá"}, format="json").data["id"]
        other_list = self.create()["id"]
        misplaced = f"{self.url}{other_list}/items/{first_id}/"
        self.assertEqual(self.client.get(misplaced).status_code, 404)
        for invalid in ([first_id], [first_id, first_id], [first_id, second_id + 1000]):
            with self.subTest(invalid=invalid):
                self.assertEqual(
                    self.client.put(
                        f"{items}reorder/", {"ids": invalid}, format="json"
                    ).status_code,
                    400,
                )
        self.assertEqual(
            [item["id"] for item in self.client.get(items).data], [first_id, second_id]
        )

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(items).status_code, 404)
        self.assertEqual(
            self.client.post(items, {"title": "Novo"}, format="json").status_code, 404
        )
        self.assertEqual(
            self.client.patch(
                f"{items}{first_id}/", {"completed": True}, format="json"
            ).status_code,
            404,
        )
        self.assertEqual(self.client.delete(f"{items}{first_id}/").status_code, 404)
        self.assertEqual(
            self.client.put(
                f"{items}reorder/", {"ids": [second_id, first_id]}, format="json"
            ).status_code,
            404,
        )

    def test_collection_prefetch_is_bounded(self):
        for title in ("Compras", "Leituras", "Metas"):
            collection_id = self.create(title=title)["id"]
            self.client.post(
                f"{self.url}{collection_id}/items/", {"title": "Item"}, format="json"
            )
        with self.assertNumQueries(2):
            response = self.client.get(self.url)
        self.assertEqual(len(response.data), 3)


class ConcurrentListTests(APITransactionTestCase):
    def test_parallel_appends_keep_distinct_order_and_partial_updates(self):
        owner = get_user_model().objects.create_user(email="parallel@example.test")
        collection = CustomList.objects.create(owner=owner, title="Planos")
        url = f"/api/v1/lists/{collection.pk}/"
        barrier = Barrier(2, timeout=10)

        def edit(title, changes):
            try:
                client = APIClient()
                client.force_authenticate(owner)
                barrier.wait()
                appended = client.post(f"{url}items/", {"title": title}, format="json")
                barrier.wait()
                patched = client.patch(url, changes, format="json")
                return appended.status_code, patched.status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(edit, "Cinema", {"title": "Férias"})
            second = pool.submit(edit, "Museu", {"color": "teal"})
            self.assertEqual(first.result(timeout=20), (201, 200))
            self.assertEqual(second.result(timeout=20), (201, 200))

        collection.refresh_from_db()
        self.assertEqual((collection.title, collection.color), ("Férias", "teal"))
        self.assertEqual(list(collection.items.values_list("position", flat=True)), [0, 1])
        self.assertSetEqual(
            set(collection.items.values_list("title", flat=True)), {"Cinema", "Museu"}
        )
