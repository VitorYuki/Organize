from rest_framework import serializers

from .models import CustomList, ListItem


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListItem
        fields = ["id", "title", "completed", "position", "created_at", "updated_at"]
        read_only_fields = ["position"]


class ListSerializer(serializers.ModelSerializer):
    items = ItemSerializer(many=True, read_only=True)

    class Meta:
        model = CustomList
        fields = ["id", "title", "color", "icon", "items", "created_at", "updated_at"]


class ReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=True)
