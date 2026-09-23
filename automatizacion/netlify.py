from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

options = Options()

options.binary_location = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"
options.add_argument(r"user-data-dir=C:\Users\PC-RYZEN5-RTX2060\AppData\Local\BraveSoftware\Brave-Browser\User Data")
options.add_argument(r"profile-directory=Default")

driver = webdriver.Chrome(options=options)

# Abrir netlify
driver.get("https://www.netlify.com/")

#Esperar a que cargue la pagina y se rendericen los componentes
elemnto = WebDriverWait(driver, 7).until(
    EC.element_to_be_clickable((By.ID, "main-nav-compact-hamburger"))
)

input("Prueba")