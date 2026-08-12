from django.urls import path

from . import views

urlpatterns = [
    path("", views.NegociosView.as_view(), name="negocios"),
    path("<int:negocio_id>/", views.NegocioDetalleView.as_view(), name="negocio_detalle"),
]