from django.urls import path

from . import views

urlpatterns = [
    path("", views.CategoriasView.as_view(), name="categorias"),
    path("<int:categoria_id>/", views.CategoriaDetalleView.as_view(), name="categoria_detalle"),
]