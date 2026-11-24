from django.urls import include, path

urlpatterns = [
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("config.domain_urls")),
]
