from django.urls import path
from . import views

urlpatterns = [
    path("gastos-por-categoria/", views.GastosPorCategoriaView.as_view(), name="gastos_por_categoria"),
    path("evolucion-mensual/", views.EvolucionMensualView.as_view(), name="evolucion_mensual"),
    path("totales/", views.TotalesView.as_view(), name="totales"),
]