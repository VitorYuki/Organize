from config.domain import PersonalViewSet

from .models import Note
from .serializers import NoteSerializer


class NoteViewSet(PersonalViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    search_fields = ["title", "content"]
    ordering_fields = ["pinned", "updated_at", "created_at", "title"]
