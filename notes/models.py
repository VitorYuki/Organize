from django.db import models

from config.domain import PersonalRecord


class Note(PersonalRecord):
    content = models.TextField(blank=True, max_length=50000)
    pinned = models.BooleanField(default=False)

    class Meta:
        ordering = ["-pinned", "-updated_at", "id"]
        indexes = [
            models.Index(fields=["owner", "-pinned", "-updated_at"], name="note_owner_recency")
        ]
