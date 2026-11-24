from django.conf import settings
from django.db import models, transaction
from rest_framework import filters, permissions, viewsets


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PersonalRecord(TimestampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=180)

    class Meta:
        abstract = True


class PersonalViewSet(viewsets.ModelViewSet):
    """Resolve both collections and detail actions within the current account."""

    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset().filter(owner=self.request.user)
        if self.action in {"update", "partial_update", "destroy"}:
            return queryset.select_for_update()
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
