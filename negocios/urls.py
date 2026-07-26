from django.urls import path

from . import views

urlpatterns = [
    path("", views.NegociosView.as_view(), name="negocios"),
]