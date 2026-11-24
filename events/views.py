from rest_framework.exceptions import ValidationError

from config.domain import PersonalViewSet

from .models import Event
from .serializers import EventSerializer, ZonedDateTimeField


class EventViewSet(PersonalViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    search_fields = ["title", "description"]
    ordering_fields = ["starts_at", "ends_at", "title", "updated_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset
        field = ZonedDateTimeField()
        bounds = {}
        for key in ("from", "to"):
            if key in self.request.query_params:
                try:
                    bounds[key] = field.run_validation(self.request.query_params[key])
                except ValidationError as error:
                    raise ValidationError({key: error.detail}) from error
        if "from" in bounds and "to" in bounds and bounds["to"] <= bounds["from"]:
            raise ValidationError({"to": "O término deve ser posterior ao início."})
        if "from" in bounds:
            queryset = queryset.filter(ends_at__gt=bounds["from"])
        if "to" in bounds:
            queryset = queryset.filter(starts_at__lt=bounds["to"])
        return queryset
