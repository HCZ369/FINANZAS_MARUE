from django.urls import path

from . import views

urlpatterns = [
    path("", views.NegociosView.as_view(), name="negocios"),
    path("setup-tablas/", views.SetupTablasView.as_view(), name="setup_tablas"),
    path("<int:negocio_id>/", views.NegocioDetalleView.as_view(), name="negocio_detalle"),
]