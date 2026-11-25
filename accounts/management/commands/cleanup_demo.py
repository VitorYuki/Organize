from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.demo import CLEANUP_BATCH, delete_expired_guests


class Command(BaseCommand):
    help = "Remove expired guest accounts, their records and expired Django sessions."

    def handle(self, *args, **options):
        deleted = count = delete_expired_guests()
        while count == CLEANUP_BATCH:
            count = delete_expired_guests()
            deleted += count
        Session.objects.filter(expire_date__lte=timezone.now()).delete()
        self.stdout.write(f"Contas de demonstração removidas: {deleted}.")
