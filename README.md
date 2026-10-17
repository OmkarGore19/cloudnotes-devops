# CloudNotes

CloudNotes is a full-stack personal notes application built with **React, Django REST Framework, and MySQL**. It is an application-only starter: Docker, Compose, Nginx, and CI/CD configuration are intentionally not included, so you can implement and understand the containerization yourself.

## Features

- Register and sign in using username/password authentication with JWTs.
- Create, view, edit, and delete notes.
- Keep notes private to the account that owns them.
- React single-page interface with responsive layouts.
- Django REST API and MySQL persistence.
- API tests for authentication and note ownership.

## Technology stack

- Frontend: React 18, Vite
- Backend: Python, Django 5.2, Django REST Framework
- Authentication: Simple JWT
- Database: MySQL 8.x
- Local frontend-to-backend proxy: Vite development server

## Repository structure

```text
cloudnotes/
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── notes/
│   │   ├── migrations/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── tests.py
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

Install these tools on your computer:

- Python 3.12 or 3.13
- Node.js 22 (with npm)
- MySQL Server 8.x
- Git (optional, for version control)

## Quick Start with Docker (Recommended)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Start the entire application (MySQL + Django Backend + React Frontend):
   ```bash
   docker compose up -d --build
   ```
3. Open **`http://localhost`** (or `http://<your-ec2-ip>`) in your browser!

## Run locally on Windows PowerShell

### 1. Create the environment file

From the project root:

```powershell
Copy-Item .env.example .env
```

Generate a local Django secret key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Put the generated value in `.env` as `DJANGO_SECRET_KEY`. Set `DB_PASSWORD` to the password you will assign to the MySQL application user. Never commit `.env` or real credentials.

### 2. Create a MySQL database and application user

Start MySQL Server. Open MySQL Workbench or a MySQL terminal as an administrator and run the following SQL, replacing the example password with a strong local password:

```sql
CREATE DATABASE cloudnotes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cloudnotes_app'@'localhost' IDENTIFIED BY 'replace-with-a-strong-local-password';
GRANT ALL PRIVILEGES ON cloudnotes.* TO 'cloudnotes_app'@'localhost';
FLUSH PRIVILEGES;
```

Make the `DB_PASSWORD` value in `.env` match the password assigned to `cloudnotes_app`. Keep the application user limited to this database; don't use the MySQL root account for the app.

### 3. Set up the Django backend

In the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

If PowerShell blocks virtual-environment activation, use this command for the current terminal only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Then migrate the database and start Django:

```powershell
cd backend
python manage.py check
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Keep this terminal open. The API will be available at `http://127.0.0.1:8000/api/`.

### 4. Set up the React frontend

Open a second PowerShell terminal at the project root, activate the virtual environment only if you need it (not required for Node), and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually **http://127.0.0.1:5173**. The Vite config proxies `/api` and `/static` requests to Django, so the browser can use the application without a separate CORS configuration.

## API endpoints

Routes are relative to `/api/`.

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `health/` | Public | Checks database connectivity |
| POST | `auth/register/` | Public | Create an account |
| POST | `auth/token/` | Public | Obtain JWT access and refresh tokens |
| POST | `auth/token/refresh/` | Public | Refresh an access token |
| GET | `notes/` | Authenticated | List the signed-in user's notes |
| POST | `notes/` | Authenticated | Create a note |
| GET | `notes/<id>/` | Authenticated | Retrieve an owned note |
| PATCH | `notes/<id>/` | Authenticated | Update an owned note |
| DELETE | `notes/<id>/` | Authenticated | Delete an owned note |

For protected endpoints, send `Authorization: Bearer <access-token>`.

## Run tests

The test suite can use SQLite so you don't need to change or seed your development MySQL database. From the `backend` directory with the virtual environment activated, run in PowerShell:

```powershell
$env:DATABASE_ENGINE = "sqlite"
$env:DJANGO_SECRET_KEY = "local-test-only-secret-key"
python manage.py test
Remove-Item Env:DATABASE_ENGINE
Remove-Item Env:DJANGO_SECRET_KEY
```

## Notes before deployment

This repository contains application code, not a finished production deployment. Before using it publicly, add and test your own Docker implementation, enforce HTTPS, use environment-specific secrets, configure strict allowed hosts, add rate limiting and operational monitoring, and plan database backups. Browser session storage is used for JWTs in this learning project; review your authentication/token strategy before handling sensitive data.
