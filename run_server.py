import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from waitress import serve
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

print("Starting server on http://0.0.0.0:8000")
serve(application, host='0.0.0.0', port=8000)
