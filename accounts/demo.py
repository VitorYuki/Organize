from datetime import datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import logout
from django.contrib.auth.hashers import make_password
from django.db import connection, transaction
from django.utils import timezone

from custom_lists.models import CustomList, ListItem
from events.models import Event
from notes.models import Note
from tasks.models import Task

from .models import User

DEMO_DURATION = timedelta(hours=24)
DEMO_DIRECTORY_LOCK = 2111475021  # Transaction-level advisory lock for guest creation.
CLEANUP_BATCH = 50


def guest_session(get_response):
    def middleware(request):
        if not request.path.startswith("/api/") or not getattr(request.user, "is_guest", False):
            return get_response(request)

        def serve(guest):
            if (
                guest is None
                or not settings.ORGANIZE_DEMO_ENABLED
                or guest.guest_expires_at <= timezone.now()
            ):
                logout(request)
            else:
                request.user = guest
            return get_response(request)

        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return serve(request.user)
        # Serialize guest writes with quotas, reset, logout and cleanup.
        with transaction.atomic():
            guest = User.objects.select_for_update().filter(pk=request.user.pk).first()
            return serve(guest)

    return middleware


@transaction.atomic
def delete_expired_guests():
    ids = list(
        User.objects.select_for_update(skip_locked=True)
        .filter(guest_expires_at__lte=timezone.now())
        .order_by("guest_expires_at")
        .values_list("pk", flat=True)[:CLEANUP_BATCH]
    )
    User.objects.filter(pk__in=ids).delete()
    return len(ids)


@transaction.atomic
def create_guest():
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [DEMO_DIRECTORY_LOCK])
    delete_expired_guests()
    if (
        User.objects.filter(guest_expires_at__isnull=False).count()
        >= settings.DEMO_MAX_ACCOUNTS
    ):
        return None
    guest = User.objects.create(
        first_name="Visitante",
        guest_expires_at=timezone.now() + DEMO_DURATION,
        password=make_password(None),
    )
    seed_guest(guest)
    return guest


@transaction.atomic
def reset_guest(guest):
    for model in (Task, Event, Note, CustomList):
        model.objects.filter(owner=guest).delete()
    seed_guest(guest)


def seed_guest(guest):
    today = timezone.localdate()
    tomorrow = today + timedelta(days=1)
    Task.objects.bulk_create(
        [
            Task(
                owner=guest,
                title="Revisar planejamento da semana",
                due_date=today,
                priority=Task.Priority.HIGH,
                category="Planejamento",
            ),
            Task(owner=guest, title="Estudar Python", due_date=today, category="Estudos"),
            Task(
                owner=guest, title="Organizar arquivos pessoais", due_date=today, completed=True
            ),
            Task(owner=guest, title="Fazer compras", due_date=tomorrow),
            Task(
                owner=guest,
                title="Ler 20 páginas de um livro",
                due_date=tomorrow,
                priority=Task.Priority.LOW,
            ),
        ]
    )
    for title, day, hour, minutes in (
        ("Reunião de projeto", today, 14, 60),
        ("Academia", tomorrow, 18, 60),
        ("Compromisso pessoal", today + timedelta(days=3), 10, 30),
    ):
        starts_at = timezone.make_aware(datetime.combine(day, time(hour)))
        Event.objects.create(
            owner=guest,
            title=title,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=minutes),
        )
    Note.objects.bulk_create(
        [
            Note(
                owner=guest,
                title="Ideias para projetos",
                pinned=True,
                content="Montar um painel de leitura e automatizar a organização das fotos.",
            ),
            Note(
                owner=guest,
                title="Planejamento semanal",
                content="Reservar duas noites para estudar e revisar as pendências na sexta.",
            ),
        ]
    )
    for title, icon, color, items in (
        ("Lista de compras", "basket", "sage", ("Pão", "Café", "Maçãs")),
        ("Filmes para assistir", "film", "blue", ("A Chegada", "O Grande Hotel Budapeste")),
        (
            "Metas do mês",
            "star",
            "amber",
            ("Terminar um livro", "Organizar a mesa de trabalho"),
        ),
    ):
        collection = CustomList.objects.create(owner=guest, title=title, icon=icon, color=color)
        ListItem.objects.bulk_create(
            [
                ListItem(collection=collection, title=item, position=position)
                for position, item in enumerate(items)
            ]
        )
