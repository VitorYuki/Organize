from django.db import models

from config.domain import PersonalRecord


class Event(PersonalRecord):
    description = models.TextField(blank=True, max_length=12000)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    all_day = models.BooleanField(default=False)

    class Meta:
        ordering = ["starts_at", "id"]
        indexes = [models.Index(fields=["owner", "starts_at"], name="event_owner_start")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")),
                name="event_ends_after_start",
            )
        ]
