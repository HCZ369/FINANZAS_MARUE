from django.urls import path
from . import views

urlpatterns = [
    path("gastos-por-categoria/", views.GastosPorCategoriaView.as_view(), name="gastos_por_categoria")
]