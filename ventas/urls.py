from django.urls import path

from . import views

urlpatterns = [
    path("clientes/", views.ClientesView.as_view(), name="clientes"),
    path("clientes/<int:cliente_id>/", views.ClienteDetalleView.as_view(), name="cliente_detalle"),
    path("productos/", views.ProductosView.as_view(), name="productos"),
    path("productos/<int:producto_id>/", views.ProductoDetalleView.as_view(), name="producto_detalle"),
    path("ventas/", views.VentasView.as_view(), name="ventas"),
    path("ventas/<int:venta_id>/", views.VentaDetalleView.as_view(), name="venta_detalle"),
]