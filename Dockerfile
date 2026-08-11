FROM python:3.12-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl gnupg apt-transport-https
RUN curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg
RUN curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 unixodbc-dev gcc g++

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --no-input

CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT