from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from config.domain import PersonalViewSet

from .models import CustomList, ListItem
from .serializers import ItemSerializer, ListSerializer, ReorderSerializer


class ListViewSet(PersonalViewSet):
    queryset = CustomList.objects.prefetch_related("items")
    serializer_class = ListSerializer
    search_fields = ["title"]
    ordering_fields = ["title", "updated_at", "created_at"]


class ItemsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def collection(self, request, list_id, *, lock=False):
        records = CustomList.objects.filter(owner=request.user)
        if lock:
            records = records.select_for_update()
        return get_object_or_404(records, pk=list_id)

    def get(self, request, list_id):
        collection = self.collection(request, list_id)
        return Response(ItemSerializer(collection.items.all(), many=True).data)

    @transaction.atomic
    def post(self, request, list_id):
        collection = self.collection(request, list_id, lock=True)
        if (
            request.user.is_guest
            and ListItem.objects.filter(collection__owner=request.user).count()
            >= settings.DEMO_ITEM_LIMIT
        ):
            raise ValidationError("Limite de itens da demonstração atingido.")
        serializer = ItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        last = collection.items.aggregate(last=Max("position"))["last"]
        serializer.save(collection=collection, position=0 if last is None else last + 1)
        collection.save(update_fields=["updated_at"])
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ItemDetail(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def record(self, request, list_id, item_id, *, lock=False):
        collections = CustomList.objects.filter(owner=request.user)
        if lock:
            collections = collections.select_for_update()
        collection = get_object_or_404(collections, pk=list_id)
        return collection, get_object_or_404(collection.items, pk=item_id)

    def get(self, request, list_id, item_id):
        _, item = self.record(request, list_id, item_id)
        return Response(ItemSerializer(item).data)

    @transaction.atomic
    def put(self, request, list_id, item_id):
        collection, item = self.record(request, list_id, item_id, lock=True)
        serializer = ItemSerializer(item, data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        serializer.save()
        collection.save(update_fields=["updated_at"])
        return Response(serializer.data)

    patch = put

    @transaction.atomic
    def delete(self, request, list_id, item_id):
        collection, item = self.record(request, list_id, item_id, lock=True)
        item.delete()
        collection.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReorderItems(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def put(self, request, list_id):
        collection = get_object_or_404(
            CustomList.objects.select_for_update(), pk=list_id, owner=request.user
        )
        serializer = ReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]
        records = collection.items.in_bulk()
        if len(ids) != len(records) or set(ids) != records.keys():
            raise ValidationError({"ids": "Inclua cada item atual da lista uma única vez."})

        now = timezone.now()
        ordered = [records[item_id] for item_id in ids]
        changed = []
        for position, item in enumerate(ordered):
            if item.position != position:
                item.position = position
                item.updated_at = now
                changed.append(item)
        if changed:
            collection.items.bulk_update(changed, ["position", "updated_at"])
            collection.save(update_fields=["updated_at"])
        return Response(ItemSerializer(ordered, many=True).data)
