from django.urls import path
from . import views

urlpatterns = [
    path("", views.listar_negocios, name="listar_negocios"),
]