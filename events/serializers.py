from datetime import time

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from .models import Event


class ZonedDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):
        if isinstance(value, str):
            try:
                parsed = parse_datetime(value)
            except ValueError:
                parsed = None
            if parsed is not None and timezone.is_naive(parsed):
                raise serializers.ValidationError("Informe o fuso horário da data.")
        return super().to_internal_value(value)


class EventSerializer(serializers.ModelSerializer):
    starts_at = ZonedDateTimeField()
    ends_at = ZonedDateTimeField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "starts_at",
            "ends_at",
            "all_day",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        end = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if start >= end:
            raise serializers.ValidationError(
                {"ends_at": "O término deve ser posterior ao início."}
            )
        if attrs.get("all_day", getattr(self.instance, "all_day", False)):
            if any(timezone.localtime(value).time() != time.min for value in (start, end)):
                raise serializers.ValidationError(
                    {
                        "all_day": "Um evento de dia inteiro começa e termina à meia-noite de São Paulo."
                    }
                )
        return attrs
