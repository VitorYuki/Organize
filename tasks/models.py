from django.db import models

from config.domain import PersonalRecord


class Task(PersonalRecord):
    class Priority(models.TextChoices):
        LOW = "low", "Baixa"
        MEDIUM = "medium", "Média"
        HIGH = "high", "Alta"

    description = models.TextField(blank=True, max_length=12000)
    due_date = models.DateField()
    due_time = models.TimeField(null=True, blank=True)
    category = models.CharField(max_length=64, blank=True)
    priority = models.CharField(max_length=6, choices=Priority, default=Priority.MEDIUM)
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["due_date", "due_time", "id"]
        indexes = [models.Index(fields=["owner", "due_date"], name="task_owner_date")]
