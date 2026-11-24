from django.db.models import Case, IntegerField, Value, When
from rest_framework import filters, serializers
from rest_framework.exceptions import ValidationError

from config.domain import PersonalViewSet

from .models import Task
from .serializers import TaskSerializer


class TaskFilters(serializers.Serializer):
    due_from = serializers.DateField(required=False)
    due_to = serializers.DateField(required=False)
    completed = serializers.BooleanField(required=False)
    priority = serializers.ChoiceField(choices=Task.Priority, required=False)
    category = serializers.CharField(max_length=64, required=False)

    def validate(self, attrs):
        if "due_from" in attrs and "due_to" in attrs and attrs["due_from"] > attrs["due_to"]:
            raise ValidationError(
                {"due_to": "A data final deve ser igual ou posterior à inicial."}
            )
        return attrs


class TaskOrdering(filters.OrderingFilter):
    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return queryset
        if any(field.lstrip("-") == "priority" for field in ordering):
            queryset = queryset.alias(
                priority_rank=Case(
                    When(priority=Task.Priority.HIGH, then=Value(3)),
                    When(priority=Task.Priority.MEDIUM, then=Value(2)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            ordering = [field.replace("priority", "priority_rank") for field in ordering]
        return queryset.order_by(*ordering, "id")


class TaskViewSet(PersonalViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    filter_backends = (filters.SearchFilter, TaskOrdering)
    search_fields = ["title", "description", "category"]
    ordering_fields = ["title", "due_date", "due_time", "completed", "priority", "updated_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset
        params = TaskFilters(data=self.request.query_params.dict())
        params.is_valid(raise_exception=True)
        lookups = {
            "due_from": "due_date__gte",
            "due_to": "due_date__lte",
            "category": "category__iexact",
        }
        criteria = {
            lookups.get(key, key): value for key, value in params.validated_data.items()
        }
        return queryset.filter(**criteria)
