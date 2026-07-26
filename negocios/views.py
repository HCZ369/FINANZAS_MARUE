from rest_framework.response import Response
from rest_framework.decorators import api_view
from core.db import fetch_all

@api_view(["GET"])
def listar_negocios(request):
    query = "SELECT * FROM negocio"
    negocios = fetch_all(query)
    return Response(negocios)