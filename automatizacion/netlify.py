from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

options = Options()

# --- Brave ---
# options.binary_location = "C:/Users/Hugo Carrera/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe"

# PC GAMER
# options.add_argument(r"--user-data-dir=C:\Users\PC-RYZEN5-RTX2060\AppData\Local\BraveSoftware\Brave-Browser\User Data")

# PC LABURO
#options.add_argument(r"--user-data-dir=C:\Users\Hugo Carrera\AppData\Local\BraveSoftware\Brave-Browser\User Data")

#PC LABURO - Chrome
options.add_argument(r"--user-data-dir=C:\Users\Hugo Carrera\AppData\Local\Google\Chrome\User Data")

## Generico
options.add_argument(r"--profile-directory=Default")

# --- Iniciar navegador ---
driver = webdriver.Chrome(options=options)
driver.get("https://www.netlify.com/")
driver.maximize_window()

# --- Netlify ---
# driver.get("https://www.netlify.com/")
# elemento = WebDriverWait(driver, 10).until(
#     EC.element_to_be_clickable((By.ID, "go-to-dashboard"))
# )
# elemento.click()

# --- Cerrar ---
# input("Presioná Enter para cerrar...")
input("esperar")
driver.quit()