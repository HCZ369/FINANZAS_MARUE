from django.urls import include, path

urlpatterns = [
    path("api/negocios/", include("negocios.urls")),
]
