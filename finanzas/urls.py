from django.urls import path

from . import views

urlpatterns = [
    path("categorias/", views.CategoriasView.as_view(), name="categorias"),
    path("categorias/<int:categoria_id>/", views.CategoriaDetalleView.as_view(), name="categoria_detalle"),
    path("inyecciones/", views.InyeccionesView.as_view(), name="inyecciones"),
    path("inyecciones/<int:inyeccion_id>/", views.InyeccionDetalleView.as_view(), name="inyeccion_detalle"),
]