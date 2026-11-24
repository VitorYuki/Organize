from django.urls import path
from rest_framework.routers import SimpleRouter

from custom_lists.views import ItemDetail, ItemsView, ListViewSet, ReorderItems
from events.views import EventViewSet
from notes.views import NoteViewSet
from tasks.views import TaskViewSet

router = SimpleRouter()
router.register("tasks", TaskViewSet, basename="task")
router.register("events", EventViewSet, basename="event")
router.register("notes", NoteViewSet, basename="note")
router.register("lists", ListViewSet, basename="list")

urlpatterns = [
    *router.urls,
    path("lists/<int:list_id>/items/", ItemsView.as_view(), name="list-items"),
    path("lists/<int:list_id>/items/reorder/", ReorderItems.as_view(), name="list-reorder"),
    path("lists/<int:list_id>/items/<int:item_id>/", ItemDetail.as_view(), name="list-item"),
]
