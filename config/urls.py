from django.urls import include, path

urlpatterns = [
    path("api/negocios/", include("negocios.urls")),
    path("api/negocios/<int:negocio_id>/", include("finanzas.urls")),
]