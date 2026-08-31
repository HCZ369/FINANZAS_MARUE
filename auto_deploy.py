import subprocess
import time
import re
import os

os.chdir(r"C:\Users\Hugo\Documents\01 - Administrador de inversiones Marue\FINANZAS_MARUE")

def capturar_url_tunel():
    log_path = r"C:\cloudflared\tunnel.log"
    intentos = 0
    while intentos < 30:
        time.sleep(2)
        intentos = intentos + 1
        try:
            archivo = open(log_path, "r")
            contenido = archivo.read()
            archivo.close()
            resultado = re.search(r"(https://[a-z0-9\-]+\.trycloudflare\.com)", contenido)
            if resultado:
                return resultado.group(1)
        except:
            pass
    return None

def pushear_url(url):
    client_path = "frontend/src/api/client.js"
    archivo = open(client_path, "r")
    contenido = archivo.read()
    archivo.close()

    nuevo = re.sub(r'export const API_BASE = ".*"', 'export const API_BASE = "' + url + '/api"', contenido)

    archivo = open(client_path, "w")
    archivo.write(nuevo)
    archivo.close()

    subprocess.run(["git", "add", client_path])
    subprocess.run(["git", "commit", "-m", "tunnel url actualizada"])
    subprocess.run(["git", "push"])
    print("URL pusheada: " + url)

def hay_commits_nuevos():
    subprocess.run(["git", "fetch"], capture_output=True)
    resultado = subprocess.run(["git", "log", "HEAD..origin/main", "--oneline"], capture_output=True, text=True)
    return len(resultado.stdout.strip()) > 0

def hacer_deploy():
    print("Cambios detectados, haciendo deploy...")
    subprocess.run(["git", "pull"])
    subprocess.run(["pip", "install", "-r", "requirements.txt"], capture_output=True)
    subprocess.run(["C:\\cloudflared\\nssm.exe", "restart", "GestorAPI"])
    print("Deploy completado")

# Paso 1: Capturar y pushear URL del tunel
print("Esperando URL del tunel...")
url = capturar_url_tunel()
if url:
    pushear_url(url)
else:
    print("No se pudo capturar la URL del tunel")

# Paso 2: Polling de commits cada 30 segundos
print("Escuchando por commits nuevos...")
while True:
    try:
        if hay_commits_nuevos():
            hacer_deploy()
    except Exception as error:
        print("Error: " + str(error))
    time.sleep(30)
