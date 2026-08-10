from django.urls import path
from . import views

urlpatterns = [
    path("gastos-por-categoria/", views.GastosPorCategoriaView.as_view(), name="gastos_por_categoria"),
    path("evolucion-mensual/", views.EvolucionMensualView.as_view(), name="evolucion_mensual"),
    path("totales/", views.TotalesView.as_view(), name="totales"),
    path("productos-mas-vendidos/", views.ProductosMasVendidosView.as_view(), name="productos_mas_vendidos"),
    path("proyeccion-vs-realidad/", views.ProyeccionVsRealidadView.as_view(), name="proyeccion_vs_realidad")
]