from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

options = Options()

# Perfil exclusivo para Selenium (no compite con Chrome abierto)
options.add_argument(r"--user-data-dir=C:\HC\Priv\Gestor\automatizacion\chrome_profile")

driver = webdriver.Chrome(options=options)
driver.maximize_window()
driver.get("https://app.netlify.com/")

wait = WebDriverWait(driver, 10)

# Seleccionar el link al catalogo
log_catalogo = wait.until(EC.element_to_be_clickable((By.LINK_TEXT, 'marue-catalogo')))
log_catalogo.click()

# Subir el archivo
file_input = wait.until(EC.presence_of_element_located((By.ID, 'dropzone-file-upload')))
file_input.send_keys(r"C:\Users\Hugo Carrera\Documents\999_Marue\index.html")

# Esperar a que Netlify confirme el deploy
time.sleep(10)

driver.quit()