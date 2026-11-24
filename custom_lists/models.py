from django.db import models

from config.domain import PersonalRecord, TimestampedModel


class CustomList(PersonalRecord):
    class Icon(models.TextChoices):
        LIST = "list", "Lista"
        BASKET = "basket", "Compras"
        BOOK = "book", "Livro"
        FILM = "film", "Filme"
        STAR = "star", "Estrela"
        BRIEFCASE = "briefcase", "Trabalho"
        HEART = "heart", "Coração"

    class Color(models.TextChoices):
        SAGE = "sage", "Sálvia"
        BLUE = "blue", "Azul"
        AMBER = "amber", "Âmbar"
        ROSE = "rose", "Rosa"
        VIOLET = "violet", "Violeta"
        TEAL = "teal", "Turquesa"

    icon = models.CharField(max_length=16, choices=Icon, default=Icon.LIST)
    color = models.CharField(max_length=16, choices=Color, default=Color.SAGE)

    class Meta:
        ordering = ["-updated_at", "id"]
        indexes = [models.Index(fields=["owner", "-updated_at"], name="list_owner_recency")]


class ListItem(TimestampedModel):
    collection = models.ForeignKey(CustomList, related_name="items", on_delete=models.CASCADE)
    title = models.CharField(max_length=240)
    completed = models.BooleanField(default=False)
    position = models.PositiveIntegerField()

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["collection", "position"],
                name="unique_position_in_collection",
                deferrable=models.Deferrable.DEFERRED,
            )
        ]
