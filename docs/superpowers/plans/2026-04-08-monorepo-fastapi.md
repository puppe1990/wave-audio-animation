# Monorepo FastAPI + Next.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate o projeto de um Next.js full-stack para um monorepo `frontend/` (Next.js UI) + `backend/` (FastAPI, processamento de áudio/vídeo server-side).

**Architecture:** Next.js serve apenas UI; FastAPI processa upload de áudio com pydub, gera frames PNG com Pillow, e codifica com ffmpeg via subprocess. Frontend faz polling para status do job. Auth migra para JWT próprio no FastAPI (sem NextAuth).

**Tech Stack:** FastAPI, uvicorn, pydub, Pillow, ffmpeg (subprocess), python-jose, passlib[bcrypt], libsql-experimental (Turso), Next.js 16, TypeScript, Vitest

> **IMPORTANTE:** Antes de qualquer código Next.js, leia `node_modules/next/dist/docs/` conforme AGENTS.md.

---

## Mapa de Arquivos

### Criados no backend
```
backend/
  requirements.txt
  .env.example
  Dockerfile
  app/
    __init__.py
    main.py              # FastAPI app + monta routers + CORS
    config.py            # Pydantic Settings, lê .env
    db.py                # libsql-experimental client + helpers execute/fetchall
    models/
      __init__.py
      user.py            # dataclass User
      job.py             # dataclass Job + dict in-memory store
    routers/
      __init__.py
      auth.py            # POST /auth/register, POST /auth/login
      exports.py         # POST /exports, GET /exports/{id}/status, GET /exports/{id}/download
    services/
      __init__.py
      auth_service.py    # hash_password, verify_password, create_token, decode_token
      audio.py           # extract_amplitudes(bytes) → (list[float], float, int, int)
      renderer.py        # draw_frame(amplitudes, frame_index, config, w, h) → bytes PNG
      exporter.py        # export_to_mp4(frames, fps, path), export_to_gif(frames, fps, path)
  tests/
    __init__.py
    conftest.py          # TestClient fixture
    test_auth.py
    test_exports.py
    test_audio.py
    test_renderer.py
    test_exporter.py
```

### Criados no frontend
```
frontend/
  src/lib/api-client.ts     # funções tipadas: login, register, createExport, pollStatus, download
  src/middleware.ts          # novo middleware sem NextAuth (cookie "token")
```

### Modificados no frontend
```
frontend/src/components/editor/StepExport.tsx   # POST + polling em vez de ffmpeg.wasm
frontend/src/app/login/page.tsx                  # chama /auth/login no backend, seta cookie
frontend/src/app/register/page.tsx               # chama /auth/register no backend, seta cookie
frontend/src/app/layout.tsx                      # remove <Providers>
```

### Removidos do frontend
```
frontend/src/app/providers.tsx
frontend/src/auth.ts
frontend/src/next-auth.d.ts
frontend/src/proxy.ts
frontend/src/lib/audio.ts
frontend/src/lib/exporter.ts
frontend/src/lib/renderer.ts
frontend/src/lib/db.ts
frontend/src/lib/db-config.ts
frontend/src/app/api/auth/
frontend/src/app/api/exports/
frontend/src/app/api/register/
```

### Criados na raiz
```
docker-compose.yml
.env.example
```

---

## Task 1: Move Next.js para frontend/

**Files:**
- Move: todos os arquivos de configuração e código Next.js para `frontend/`

- [ ] **Step 1: Criar diretório e mover arquivos**

```bash
mkdir frontend
git mv src frontend/src
git mv public frontend/public
git mv package.json frontend/package.json
git mv package-lock.json frontend/package-lock.json
git mv tsconfig.json frontend/tsconfig.json
git mv tsconfig.tsbuildinfo frontend/tsconfig.tsbuildinfo
git mv next.config.ts frontend/next.config.ts
git mv postcss.config.mjs frontend/postcss.config.mjs
git mv eslint.config.mjs frontend/eslint.config.mjs
git mv vitest.config.ts frontend/vitest.config.ts
git mv next-env.d.ts frontend/next-env.d.ts
git mv drizzle.config.ts frontend/drizzle.config.ts
```

- [ ] **Step 2: Reinstalar node_modules dentro de frontend/**

```bash
rm -rf node_modules
cd frontend && npm install
```

- [ ] **Step 3: Verificar que o Next.js ainda sobe**

```bash
cd frontend && npm run dev
```

Esperado: app sobe na porta 3000 sem erros.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move Next.js project to frontend/"
```

---

## Task 2: Backend skeleton (FastAPI + config)

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Criar requirements.txt**

```
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.12
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pydub==0.25.1
Pillow==10.4.0
libsql-experimental==0.0.26
httpx==0.27.2
pytest==8.3.3
pytest-asyncio==0.24.0
pydantic-settings==2.5.2
```

- [ ] **Step 2: Criar .env.example**

```bash
# backend/.env.example
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-token
JWT_SECRET=change-me-to-a-random-256-bit-secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 3: Criar app/config.py**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    turso_url: str = "file:local.db"
    turso_token: str = ""
    jwt_secret: str = "dev-secret-change-in-prod"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: Criar app/__init__.py e app/main.py**

```python
# backend/app/__init__.py
```

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="Wave API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Criar tests/conftest.py**

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)
```

- [ ] **Step 6: Criar tests/__init__.py**

```python
# backend/tests/__init__.py
```

- [ ] **Step 7: Escrever teste do health check**

```python
# backend/tests/test_health.py
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 8: Instalar deps e rodar teste**

```bash
cd backend && pip install -r requirements.txt
pytest tests/test_health.py -v
```

Esperado: `PASSED`.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: add FastAPI backend skeleton with health check"
```

---

## Task 3: Database layer (Turso / libsql)

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/tests/test_db.py`

- [ ] **Step 1: Escrever teste do db**

```python
# backend/tests/test_db.py
import pytest
from app.db import execute, fetchall, init_db


def test_init_and_query():
    init_db()
    rows = fetchall("SELECT name FROM sqlite_master WHERE type='table'")
    table_names = [r[0] for r in rows]
    assert "users" in table_names
    assert "exports" in table_names
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

```bash
cd backend && pytest tests/test_db.py -v
```

Esperado: `FAILED` com `ImportError`.

- [ ] **Step 3: Criar app/db.py**

```python
# backend/app/db.py
import libsql_experimental as libsql
from app.config import settings


def _get_connection():
    if settings.turso_url.startswith("file:") or settings.turso_url == "":
        # local SQLite
        path = settings.turso_url.replace("file:", "") or "local.db"
        return libsql.connect(path)
    return libsql.connect(
        settings.turso_url,
        auth_token=settings.turso_token,
    )


def init_db() -> None:
    con = _get_connection()
    con.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password_hash TEXT,
            created_at INTEGER NOT NULL
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS exports (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            status TEXT NOT NULL DEFAULT 'processing',
            format TEXT NOT NULL,
            duration INTEGER NOT NULL,
            style TEXT NOT NULL,
            aspect_ratio TEXT NOT NULL,
            file_path TEXT,
            created_at INTEGER NOT NULL
        )
    """)
    con.commit()


def execute(sql: str, params: tuple = ()) -> None:
    con = _get_connection()
    con.execute(sql, params)
    con.commit()


def fetchall(sql: str, params: tuple = ()) -> list[tuple]:
    con = _get_connection()
    return con.execute(sql, params).fetchall()


def fetchone(sql: str, params: tuple = ()) -> tuple | None:
    con = _get_connection()
    return con.execute(sql, params).fetchone()
```

- [ ] **Step 4: Rodar teste**

```bash
cd backend && pytest tests/test_db.py -v
```

Esperado: `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/db.py backend/tests/test_db.py
git commit -m "feat: add Turso/libSQL database layer"
```

---

## Task 4: Auth service (JWT + bcrypt)

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/tests/test_auth_service.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/test_auth_service.py
from app.services.auth_service import hash_password, verify_password, create_token, decode_token


def test_hash_and_verify():
    hashed = hash_password("my-password")
    assert verify_password("my-password", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_and_decode_token():
    secret = "test-secret"
    token = create_token("user-123", secret)
    assert decode_token(token, secret) == "user-123"


def test_invalid_token_raises():
    import pytest
    from jose import JWTError
    with pytest.raises(JWTError):
        decode_token("invalid.token.here", "secret")
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd backend && pytest tests/test_auth_service.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar services/__init__.py e services/auth_service.py**

```python
# backend/app/services/__init__.py
```

```python
# backend/app/services/auth_service.py
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _pwd.verify(password, hashed)


def create_token(user_id: str, secret: str, expires_hours: int = 168) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expires_hours),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, secret: str) -> str:
    """Returns user_id. Raises JWTError if token is invalid or expired."""
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    return payload["sub"]
```

- [ ] **Step 4: Rodar testes**

```bash
cd backend && pytest tests/test_auth_service.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ backend/tests/test_auth_service.py
git commit -m "feat: add JWT + bcrypt auth service"
```

---

## Task 5: User model + Auth router

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/test_auth.py
import pytest
from app.db import init_db


@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setenv("TURSO_URL", f"file:{db_path}")
    # Reimport settings após patch
    import importlib
    import app.config
    importlib.reload(app.config)
    import app.db
    importlib.reload(app.db)
    import app.routers.auth
    importlib.reload(app.routers.auth)
    from app.db import init_db
    init_db()


def test_register(client):
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "secret123",
        "name": "Test User",
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["email"] == "test@example.com"


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "abc123", "name": "A"}
    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409


def test_login(client):
    client.post("/auth/register", json={
        "email": "login@example.com",
        "password": "pass123",
        "name": "Login User",
    })
    response = client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "pass123",
    })
    assert response.status_code == 200
    assert "token" in response.json()


def test_login_wrong_password(client):
    client.post("/auth/register", json={
        "email": "bad@example.com",
        "password": "correct",
        "name": "B",
    })
    response = client.post("/auth/login", json={
        "email": "bad@example.com",
        "password": "wrong",
    })
    assert response.status_code == 401
```

- [ ] **Step 2: Confirmar falha**

```bash
cd backend && pytest tests/test_auth.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar models/__init__.py e models/user.py**

```python
# backend/app/models/__init__.py
```

```python
# backend/app/models/user.py
from dataclasses import dataclass


@dataclass
class User:
    id: str
    email: str
    name: str | None
    password_hash: str | None
    created_at: int
```

- [ ] **Step 4: Criar routers/__init__.py e routers/auth.py**

```python
# backend/app/routers/__init__.py
```

```python
# backend/app/routers/auth.py
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db import execute, fetchone
from app.services.auth_service import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str
    name: str | None


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    existing = fetchone("SELECT id FROM users WHERE email = ?", (req.email,))
    if existing:
        raise HTTPException(status_code=409, detail="Email já cadastrado.")

    user_id = str(uuid.uuid4())
    password_hash = hash_password(req.password)
    execute(
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, req.email, req.name, password_hash, int(time.time())),
    )
    token = create_token(user_id, settings.jwt_secret)
    return AuthResponse(token=token, email=req.email, name=req.name)


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    row = fetchone(
        "SELECT id, email, name, password_hash FROM users WHERE email = ?",
        (req.email,),
    )
    if not row or not verify_password(req.password, row[3] or ""):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos.")

    token = create_token(row[0], settings.jwt_secret)
    return AuthResponse(token=token, email=row[1], name=row[2])
```

- [ ] **Step 5: Registrar router em main.py**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import auth

app = FastAPI(title="Wave API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Rodar testes**

```bash
cd backend && pytest tests/test_auth.py tests/test_health.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/ backend/app/routers/ backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: add auth router with register and login endpoints"
```

---

## Task 6: Job model (in-memory store)

**Files:**
- Create: `backend/app/models/job.py`
- Create: `backend/tests/test_job_store.py`

- [ ] **Step 1: Escrever teste**

```python
# backend/tests/test_job_store.py
from app.models.job import Job, job_store


def test_create_and_get_job():
    job = Job(id="abc", user_id="user-1", format="mp4", duration=30, style="bars", aspect_ratio="16:9")
    job_store["abc"] = job

    retrieved = job_store.get("abc")
    assert retrieved is not None
    assert retrieved.status == "processing"
    assert retrieved.format == "mp4"


def test_update_job_status():
    job = Job(id="xyz", user_id="user-1", format="gif", duration=10, style="line", aspect_ratio="1:1")
    job_store["xyz"] = job
    job_store["xyz"].status = "done"
    job_store["xyz"].file_path = "/tmp/xyz.gif"

    assert job_store["xyz"].status == "done"
    assert job_store["xyz"].file_path == "/tmp/xyz.gif"
```

- [ ] **Step 2: Confirmar falha**

```bash
cd backend && pytest tests/test_job_store.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar models/job.py**

```python
# backend/app/models/job.py
from dataclasses import dataclass, field

WaveStyle = str   # "bars" | "line" | "mirror"
AspectRatio = str  # "16:9" | "9:16" | "1:1"
ExportFormat = str  # "mp4" | "gif"


@dataclass
class Job:
    id: str
    user_id: str
    format: ExportFormat
    duration: int        # seconds
    style: WaveStyle
    aspect_ratio: AspectRatio
    status: str = "processing"   # "processing" | "done" | "error"
    file_path: str | None = None
    error_message: str | None = None


# In-memory store: job_id → Job
job_store: dict[str, Job] = {}
```

- [ ] **Step 4: Rodar testes**

```bash
cd backend && pytest tests/test_job_store.py -v
```

Esperado: `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/job.py backend/tests/test_job_store.py
git commit -m "feat: add in-memory job store"
```

---

## Task 7: Audio service (pydub → amplitudes)

**Files:**
- Create: `backend/app/services/audio.py`
- Create: `backend/tests/test_audio.py`

> Requer `ffmpeg` instalado no sistema: `brew install ffmpeg` (macOS) ou `apt install ffmpeg` (Linux).

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/test_audio.py
import math
import struct
import wave
import io

from app.services.audio import extract_amplitudes, FPS


def _make_sine_wav(frequency: float = 440.0, duration: float = 1.0, sample_rate: int = 44100) -> bytes:
    """Generate a minimal valid WAV file with a sine wave."""
    num_samples = int(sample_rate * duration)
    buf = io.BytesIO()
    with wave.open(buf, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)  # 16-bit
        w.setframerate(sample_rate)
        for i in range(num_samples):
            sample = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
            w.writeframes(struct.pack("<h", sample))
    return buf.getvalue()


def test_extract_amplitudes_returns_correct_frame_count():
    wav_bytes = _make_sine_wav(duration=1.0)
    amplitudes, duration, sample_rate, frame_count = extract_amplitudes(wav_bytes)
    assert frame_count == math.ceil(duration * FPS)
    assert len(amplitudes) == frame_count


def test_amplitudes_normalized_0_to_1():
    wav_bytes = _make_sine_wav(duration=0.5)
    amplitudes, _, _, _ = extract_amplitudes(wav_bytes)
    assert max(amplitudes) <= 1.0
    assert min(amplitudes) >= 0.0
    # At least one amplitude close to 1.0 (sine wave)
    assert max(amplitudes) > 0.9


def test_duration_roughly_correct():
    wav_bytes = _make_sine_wav(duration=2.0)
    _, duration, _, _ = extract_amplitudes(wav_bytes)
    assert abs(duration - 2.0) < 0.1
```

- [ ] **Step 2: Confirmar falha**

```bash
cd backend && pytest tests/test_audio.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar services/audio.py**

```python
# backend/app/services/audio.py
import io
import math

from pydub import AudioSegment

FPS = 30


def extract_amplitudes(audio_bytes: bytes) -> tuple[list[float], float, int, int]:
    """
    Decodes audio bytes, extracts RMS amplitude per frame at FPS.
    Returns: (amplitudes, duration_seconds, sample_rate, frame_count)
    Amplitudes are normalized to [0, 1].
    """
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
    audio = audio.set_channels(1)

    samples = audio.get_array_of_samples()
    sample_rate = audio.frame_rate
    duration = len(samples) / sample_rate
    frame_count = math.ceil(duration * FPS)
    samples_per_frame = max(1, int(sample_rate / FPS))

    amplitudes: list[float] = []
    for i in range(frame_count):
        start = i * samples_per_frame
        end = min(start + samples_per_frame, len(samples))
        chunk = samples[start:end]
        if not chunk:
            amplitudes.append(0.0)
            continue
        rms = math.sqrt(sum(float(s) * float(s) for s in chunk) / len(chunk))
        amplitudes.append(rms)

    # normalize to [0, 1]
    max_val = max(amplitudes) if amplitudes else 1.0
    if max_val > 0:
        amplitudes = [a / max_val for a in amplitudes]

    return amplitudes, duration, sample_rate, frame_count
```

- [ ] **Step 4: Rodar testes**

```bash
cd backend && pytest tests/test_audio.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/audio.py backend/tests/test_audio.py
git commit -m "feat: add audio service — RMS amplitude extraction with pydub"
```

---

## Task 8: Renderer service (Pillow → frames PNG)

**Files:**
- Create: `backend/app/services/renderer.py`
- Create: `backend/tests/test_renderer.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/test_renderer.py
import io
from PIL import Image

from app.services.renderer import draw_frame

CONFIG = {
    "style": "bars",
    "primary_color": "#22d3ee",
    "background_color": "#020617",
}


def test_draw_frame_returns_png_bytes():
    amplitudes = [0.5] * 100
    png_bytes = draw_frame(amplitudes, 0, CONFIG, 1920, 1080)
    assert isinstance(png_bytes, bytes)
    # Verify it's a valid PNG
    img = Image.open(io.BytesIO(png_bytes))
    assert img.format == "PNG"
    assert img.size == (1920, 1080)


def test_draw_frame_background_color():
    amplitudes = [0.0] * 10  # all silent → no bars drawn
    png_bytes = draw_frame(amplitudes, 0, CONFIG, 100, 100)
    img = Image.open(io.BytesIO(png_bytes))
    # Top-left pixel should be the background color
    r, g, b = img.getpixel((0, 0))
    assert (r, g, b) == (2, 6, 23)  # #020617


def test_all_styles_produce_valid_image():
    amplitudes = [0.8] * 200
    for style in ("bars", "line", "mirror"):
        cfg = {**CONFIG, "style": style}
        png_bytes = draw_frame(amplitudes, 50, cfg, 1080, 1080)
        img = Image.open(io.BytesIO(png_bytes))
        assert img.size == (1080, 1080)
```

- [ ] **Step 2: Confirmar falha**

```bash
cd backend && pytest tests/test_renderer.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar services/renderer.py**

```python
# backend/app/services/renderer.py
import io

from PIL import Image, ImageDraw


ASPECT_RATIO_DIMENSIONS: dict[str, tuple[int, int]] = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
}


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def draw_frame(
    amplitudes: list[float],
    frame_index: int,
    config: dict,
    width: int,
    height: int,
) -> bytes:
    """Renders one animation frame as PNG bytes."""
    bg = _hex_to_rgb(config["background_color"])
    fg = _hex_to_rgb(config["primary_color"])
    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)

    safe_index = min(frame_index, len(amplitudes) - 1)
    style = config["style"]

    if style == "bars":
        _draw_bars(draw, amplitudes, safe_index, fg, width, height)
    elif style == "line":
        _draw_line(draw, amplitudes, safe_index, fg, width, height)
    elif style == "mirror":
        _draw_mirror(draw, amplitudes, safe_index, fg, width, height)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _draw_bars(
    draw: ImageDraw.ImageDraw,
    amplitudes: list[float],
    frame_index: int,
    color: tuple[int, int, int],
    width: int,
    height: int,
) -> None:
    bar_count = 64
    bar_w = (width / bar_count) * 0.6
    gap = (width / bar_count) * 0.4
    half = bar_count // 2

    for i in range(bar_count):
        idx = max(0, min(len(amplitudes) - 1, frame_index - half + i))
        amp = amplitudes[idx]
        bar_h = max(4, amp * height * 0.85)
        x = i * (bar_w + gap) + gap / 2
        y = height - bar_h
        draw.rectangle([x, y, x + bar_w, height], fill=color)


def _draw_line(
    draw: ImageDraw.ImageDraw,
    amplitudes: list[float],
    frame_index: int,
    color: tuple[int, int, int],
    width: int,
    height: int,
) -> None:
    points_count = 120
    half = points_count // 2
    center_y = height / 2

    points: list[tuple[float, float]] = []
    for i in range(points_count):
        idx = max(0, min(len(amplitudes) - 1, frame_index - half + i))
        x = (i / (points_count - 1)) * width
        y = center_y - amplitudes[idx] * height * 0.4
        points.append((x, y))

    if len(points) >= 2:
        line_w = max(3, width // 400)
        draw.line(points, fill=color, width=line_w)


def _draw_mirror(
    draw: ImageDraw.ImageDraw,
    amplitudes: list[float],
    frame_index: int,
    color: tuple[int, int, int],
    width: int,
    height: int,
) -> None:
    bar_count = 64
    bar_w = (width / bar_count) * 0.6
    gap = (width / bar_count) * 0.4
    half = bar_count // 2
    center_y = height / 2

    for i in range(bar_count):
        idx = max(0, min(len(amplitudes) - 1, frame_index - half + i))
        amp = amplitudes[idx]
        bar_h = max(2, amp * height * 0.42)
        x = i * (bar_w + gap) + gap / 2

        draw.rectangle([x, center_y - bar_h, x + bar_w, center_y], fill=color)
        draw.rectangle([x, center_y, x + bar_w, center_y + bar_h], fill=color)
```

- [ ] **Step 4: Rodar testes**

```bash
cd backend && pytest tests/test_renderer.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/renderer.py backend/tests/test_renderer.py
git commit -m "feat: add renderer service — bars/line/mirror frames with Pillow"
```

---

## Task 9: Exporter service (ffmpeg subprocess)

**Files:**
- Create: `backend/app/services/exporter.py`
- Create: `backend/tests/test_exporter.py`

> Requer `ffmpeg` instalado: `brew install ffmpeg` ou `apt install ffmpeg`.

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/test_exporter.py
import io
import math
import os
import struct
import wave

from PIL import Image

from app.services.exporter import export_to_mp4, export_to_gif


def _make_blank_frames(count: int = 10, width: int = 320, height: int = 240) -> list[bytes]:
    frames = []
    for _ in range(count):
        buf = io.BytesIO()
        Image.new("RGB", (width, height), (0, 10, 20)).save(buf, format="PNG")
        frames.append(buf.getvalue())
    return frames


def test_export_to_mp4(tmp_path):
    frames = _make_blank_frames()
    output = str(tmp_path / "out.mp4")
    export_to_mp4(frames, fps=10, output_path=output)
    assert os.path.exists(output)
    assert os.path.getsize(output) > 0


def test_export_to_gif(tmp_path):
    frames = _make_blank_frames()
    output = str(tmp_path / "out.gif")
    export_to_gif(frames, fps=10, output_path=output)
    assert os.path.exists(output)
    assert os.path.getsize(output) > 0
```

- [ ] **Step 2: Confirmar falha**

```bash
cd backend && pytest tests/test_exporter.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar services/exporter.py**

```python
# backend/app/services/exporter.py
import subprocess
import tempfile
import os


def export_to_mp4(frames: list[bytes], fps: int, output_path: str) -> None:
    """Renders PNG frames to MP4 using ffmpeg subprocess."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for i, frame in enumerate(frames):
            with open(os.path.join(tmpdir, f"frame_{i:05d}.png"), "wb") as f:
                f.write(frame)
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", os.path.join(tmpdir, "frame_%05d.png"),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-crf", "23",
                output_path,
            ],
            check=True,
            capture_output=True,
        )


def export_to_gif(frames: list[bytes], fps: int, output_path: str) -> None:
    """Renders PNG frames to GIF using ffmpeg palettegen + paletteuse."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for i, frame in enumerate(frames):
            with open(os.path.join(tmpdir, f"frame_{i:05d}.png"), "wb") as f:
                f.write(frame)

        palette_path = os.path.join(tmpdir, "palette.png")
        frames_pattern = os.path.join(tmpdir, "frame_%05d.png")

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", frames_pattern,
                "-vf", "palettegen",
                palette_path,
            ],
            check=True,
            capture_output=True,
        )
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", frames_pattern,
                "-i", palette_path,
                "-lavfi", "paletteuse",
                output_path,
            ],
            check=True,
            capture_output=True,
        )
```

- [ ] **Step 4: Rodar testes**

```bash
cd backend && pytest tests/test_exporter.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/exporter.py backend/tests/test_exporter.py
git commit -m "feat: add exporter service — MP4 and GIF via ffmpeg subprocess"
```

---

## Task 10: Exports router

**Files:**
- Create: `backend/app/routers/exports.py`
- Create: `backend/tests/test_exports.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/test_exports.py
import io
import math
import struct
import wave
import pytest
from app.db import init_db
from app.models.job import job_store


def _make_wav(duration: float = 0.5) -> bytes:
    sample_rate = 8000
    num_samples = int(sample_rate * duration)
    buf = io.BytesIO()
    with wave.open(buf, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for i in range(num_samples):
            sample = int(16000 * math.sin(2 * math.pi * 440 * i / sample_rate))
            w.writeframes(struct.pack("<h", sample))
    return buf.getvalue()


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    monkeypatch.setenv("TURSO_URL", f"file:{tmp_path}/test.db")
    import importlib
    import app.config, app.db, app.routers.exports
    importlib.reload(app.config)
    importlib.reload(app.db)
    importlib.reload(app.routers.exports)
    from app.db import init_db
    init_db()
    job_store.clear()


def test_create_export_returns_job_id(client):
    wav_bytes = _make_wav()
    response = client.post(
        "/exports",
        files={"audio": ("test.wav", wav_bytes, "audio/wav")},
        data={"format": "mp4", "style": "bars", "aspect_ratio": "16:9"},
    )
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "processing"


def test_get_job_status(client):
    wav_bytes = _make_wav()
    create_resp = client.post(
        "/exports",
        files={"audio": ("test.wav", wav_bytes, "audio/wav")},
        data={"format": "mp4", "style": "bars", "aspect_ratio": "16:9"},
    )
    job_id = create_resp.json()["job_id"]

    status_resp = client.get(f"/exports/{job_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] in ("processing", "done", "error")


def test_get_status_unknown_job(client):
    response = client.get("/exports/nonexistent-id/status")
    assert response.status_code == 404
```

- [ ] **Step 2: Confirmar falha**

```bash
cd backend && pytest tests/test_exports.py -v
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar routers/exports.py**

```python
# backend/app/routers/exports.py
import os
import time
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.db import execute
from app.models.job import Job, job_store
from app.services.audio import FPS, extract_amplitudes
from app.services.exporter import export_to_gif, export_to_mp4
from app.services.renderer import ASPECT_RATIO_DIMENSIONS, draw_frame

router = APIRouter(prefix="/exports", tags=["exports"])

MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50 MB


class JobCreatedResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    status: str
    download_url: str | None = None
    error: str | None = None


def _process_export(job_id: str, audio_bytes: bytes, config: dict) -> None:
    job = job_store[job_id]
    try:
        amplitudes, duration, _, frame_count = extract_amplitudes(audio_bytes)
        width, height = ASPECT_RATIO_DIMENSIONS[config["aspect_ratio"]]

        frames: list[bytes] = []
        for i in range(frame_count):
            frames.append(draw_frame(amplitudes, i, config, width, height))

        ext = job.format
        output_path = f"/tmp/{job_id}.{ext}"

        if ext == "mp4":
            export_to_mp4(frames, FPS, output_path)
        else:
            export_to_gif(frames, FPS, output_path)

        job.status = "done"
        job.file_path = output_path

        execute(
            "UPDATE exports SET status = ?, file_path = ? WHERE id = ?",
            ("done", output_path, job_id),
        )
    except Exception as e:
        job.status = "error"
        job.error_message = str(e)
        execute(
            "UPDATE exports SET status = ? WHERE id = ?",
            ("error", job_id),
        )


@router.post("", response_model=JobCreatedResponse, status_code=202)
async def create_export(
    background_tasks: BackgroundTasks,
    audio: Annotated[UploadFile, File()],
    format: Annotated[str, Form()],
    style: Annotated[str, Form()],
    aspect_ratio: Annotated[str, Form()],
    primary_color: Annotated[str, Form()] = "#22d3ee",
    background_color: Annotated[str, Form()] = "#020617",
):
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo maior que 50MB.")

    if format not in ("mp4", "gif"):
        raise HTTPException(status_code=422, detail="Formato inválido. Use mp4 ou gif.")
    if style not in ("bars", "line", "mirror"):
        raise HTTPException(status_code=422, detail="Estilo inválido.")
    if aspect_ratio not in ("16:9", "9:16", "1:1"):
        raise HTTPException(status_code=422, detail="Proporção inválida.")

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        user_id="anonymous",  # TODO: extrair do JWT quando auth estiver integrado
        format=format,
        duration=0,
        style=style,
        aspect_ratio=aspect_ratio,
    )
    job_store[job_id] = job

    execute(
        "INSERT INTO exports (id, user_id, status, format, duration, style, aspect_ratio, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (job_id, "anonymous", "processing", format, 0, style, aspect_ratio, int(time.time())),
    )

    config = {
        "style": style,
        "primary_color": primary_color,
        "background_color": background_color,
        "aspect_ratio": aspect_ratio,
    }
    background_tasks.add_task(_process_export, job_id, audio_bytes, config)

    return JobCreatedResponse(job_id=job_id, status="processing")


@router.get("/{job_id}/status", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")

    download_url = f"/exports/{job_id}/download" if job.status == "done" else None
    return JobStatusResponse(status=job.status, download_url=download_url, error=job.error_message)


@router.get("/{job_id}/download")
def download_export(job_id: str):
    job = job_store.get(job_id)
    if not job or job.status != "done" or not job.file_path:
        raise HTTPException(status_code=404, detail="Arquivo não disponível.")
    if not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor.")

    media_type = "video/mp4" if job.format == "mp4" else "image/gif"
    return FileResponse(job.file_path, media_type=media_type, filename=f"waveform.{job.format}")
```

- [ ] **Step 4: Registrar router em main.py**

Adicionar ao `backend/app/main.py`:

```python
from app.routers import auth, exports   # adicionar exports

# ...
app.include_router(auth.router)
app.include_router(exports.router)      # adicionar esta linha
```

- [ ] **Step 5: Rodar todos os testes do backend**

```bash
cd backend && pytest -v
```

Esperado: todos `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/exports.py backend/app/main.py backend/tests/test_exports.py
git commit -m "feat: add exports router with job queue via BackgroundTasks"
```

---

## Task 11: Frontend — remover deps e arquivos antigos

**Files:**
- Modify: `frontend/package.json`
- Delete: vários arquivos listados abaixo

- [ ] **Step 1: Remover arquivos de auth e processamento antigos**

```bash
cd frontend

# Auth NextAuth
rm src/auth.ts src/next-auth.d.ts src/app/providers.tsx src/proxy.ts src/proxy.test.ts
rm src/auth.test.ts

# Rotas de API Next.js
rm -rf src/app/api/auth src/app/api/exports src/app/api/register

# Processamento client-side (migrado para o backend)
rm src/lib/audio.ts src/lib/audio.test.ts
rm src/lib/exporter.ts src/lib/exporter.test.ts
rm src/lib/renderer.ts src/lib/renderer.test.ts
rm src/lib/db.ts src/lib/db-config.ts src/lib/db-config.test.ts
rm src/db/schema.ts src/db/schema.test.ts
rm -rf src/db

# Config Drizzle
rm drizzle.config.ts
```

- [ ] **Step 2: Remover deps do package.json**

Remover de `frontend/package.json` as seguintes dependências (editar manualmente):
- `next-auth`
- `@auth/drizzle-adapter` (se presente)
- `drizzle-orm`
- `drizzle-kit`
- `@libsql/client`
- `@ffmpeg/ffmpeg`
- `@ffmpeg/util`
- `bcrypt`, `@types/bcrypt` (se presente)

- [ ] **Step 3: Reinstalar deps**

```bash
cd frontend && npm install
```

- [ ] **Step 4: Verificar que o build não quebra completamente**

```bash
cd frontend && npm run build 2>&1 | head -50
```

Esperado: erros de import em arquivos que referenciam os removidos — isso é esperado e será corrigido nas tasks seguintes.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add -A
git commit -m "refactor: remove NextAuth, ffmpeg.wasm, Drizzle, and client-side processing"
```

---

## Task 12: Frontend — api-client.ts

**Files:**
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/lib/api-client.test.ts`

- [ ] **Step 1: Escrever testes**

```typescript
// frontend/src/lib/api-client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createExport, pollStatus } from "./api-client"

global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("createExport", () => {
  it("sends multipart POST and returns job_id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: "abc-123", status: "processing" }),
    } as Response)

    const file = new File(["audio"], "test.wav", { type: "audio/wav" })
    const result = await createExport(file, {
      format: "mp4",
      style: "bars",
      aspectRatio: "16:9",
    })

    expect(result.job_id).toBe("abc-123")
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/exports"),
      expect.objectContaining({ method: "POST" }),
    )
  })
})

describe("pollStatus", () => {
  it("returns status object", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "done", download_url: "/exports/abc-123/download" }),
    } as Response)

    const result = await pollStatus("abc-123")
    expect(result.status).toBe("done")
    expect(result.download_url).toBe("/exports/abc-123/download")
  })
})
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd frontend && npx vitest run src/lib/api-client.test.ts
```

Esperado: `FAILED`.

- [ ] **Step 3: Criar src/lib/api-client.ts**

```typescript
// frontend/src/lib/api-client.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeader(),
      ...(init?.headers ?? {}),
    },
  })
  return response
}

// --- Auth ---

export interface AuthResponse {
  token: string
  email: string
  name: string | null
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? "Erro ao criar conta.")
  }
  return res.json()
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error("Email ou senha inválidos.")
  }
  return res.json()
}

// --- Exports ---

export interface ExportOptions {
  format: "mp4" | "gif"
  style: "bars" | "line" | "mirror"
  aspectRatio: "16:9" | "9:16" | "1:1"
  primaryColor?: string
  backgroundColor?: string
}

export interface JobCreated {
  job_id: string
  status: string
}

export interface JobStatus {
  status: "processing" | "done" | "error"
  download_url: string | null
  error: string | null
}

export async function createExport(audio: File, options: ExportOptions): Promise<JobCreated> {
  const form = new FormData()
  form.append("audio", audio)
  form.append("format", options.format)
  form.append("style", options.style)
  form.append("aspect_ratio", options.aspectRatio)
  form.append("primary_color", options.primaryColor ?? "#22d3ee")
  form.append("background_color", options.backgroundColor ?? "#020617")

  const res = await apiFetch("/exports", { method: "POST", body: form })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? "Erro ao iniciar exportação.")
  }
  return res.json()
}

export async function pollStatus(jobId: string): Promise<JobStatus> {
  const res = await apiFetch(`/exports/${jobId}/status`)
  if (!res.ok) throw new Error("Erro ao buscar status do job.")
  return res.json()
}

export function getDownloadUrl(jobId: string): string {
  return `${API_URL}/exports/${jobId}/download`
}
```

- [ ] **Step 4: Rodar testes**

```bash
cd frontend && npx vitest run src/lib/api-client.test.ts
```

Esperado: todos `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api-client.ts frontend/src/lib/api-client.test.ts
git commit -m "feat: add api-client.ts with typed fetch wrapper for FastAPI backend"
```

---

## Task 13: Frontend — StepExport.tsx (POST + polling)

**Files:**
- Modify: `frontend/src/components/editor/StepExport.tsx`
- Modify: `frontend/src/components/editor/StepExport.test.tsx`

- [ ] **Step 1: Atualizar StepExport.test.tsx**

Substituir o conteúdo completo de `frontend/src/components/editor/StepExport.test.tsx`:

```typescript
// frontend/src/components/editor/StepExport.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { StepExport } from "./StepExport"
import type { AudioData, EditorConfig } from "@/types"

vi.mock("@/lib/api-client", () => ({
  createExport: vi.fn(),
  pollStatus: vi.fn(),
  getDownloadUrl: vi.fn(() => "http://localhost:8000/exports/job-1/download"),
}))

import { createExport, pollStatus } from "@/lib/api-client"

const AUDIO_DATA: AudioData = {
  amplitudes: new Float32Array([0.5, 0.8]),
  duration: 10,
  sampleRate: 44100,
  frameCount: 300,
  sourceFile: new File(["audio"], "test.wav", { type: "audio/wav" }),
}

const CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#22d3ee",
  backgroundColor: "#020617",
  aspectRatio: "16:9",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("StepExport", () => {
  it("renders export button", () => {
    render(<StepExport audioData={AUDIO_DATA} config={CONFIG} />)
    expect(screen.getByRole("button", { name: /exportar/i })).toBeTruthy()
  })

  it("shows processing state after clicking export", async () => {
    vi.mocked(createExport).mockResolvedValueOnce({ job_id: "job-1", status: "processing" })
    vi.mocked(pollStatus).mockResolvedValue({ status: "processing", download_url: null, error: null })

    render(<StepExport audioData={AUDIO_DATA} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))

    await waitFor(() => {
      expect(screen.getByText(/processando/i)).toBeTruthy()
    })
  })

  it("shows download button when done", async () => {
    vi.mocked(createExport).mockResolvedValueOnce({ job_id: "job-1", status: "processing" })
    vi.mocked(pollStatus)
      .mockResolvedValueOnce({ status: "processing", download_url: null, error: null })
      .mockResolvedValueOnce({ status: "done", download_url: "/exports/job-1/download", error: null })

    render(<StepExport audioData={AUDIO_DATA} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /baixar/i })).toBeTruthy()
    }, { timeout: 5000 })
  })

  it("shows error when createExport fails", async () => {
    vi.mocked(createExport).mockRejectedValueOnce(new Error("Erro de rede"))

    render(<StepExport audioData={AUDIO_DATA} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))

    await waitFor(() => {
      expect(screen.getByText(/falha/i)).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd frontend && npx vitest run src/components/editor/StepExport.test.tsx
```

Esperado: `FAILED`.

- [ ] **Step 3: Reescrever StepExport.tsx**

Substituir o conteúdo completo de `frontend/src/components/editor/StepExport.tsx`:

```typescript
// frontend/src/components/editor/StepExport.tsx
"use client"

import { useRef, useState } from "react"
import { createExport, getDownloadUrl, pollStatus } from "@/lib/api-client"
import type { AudioData, EditorConfig, ExportFormat } from "@/types"

interface Props {
  audioData: AudioData
  config: EditorConfig
  onRestart?: () => void
}

export function StepExport({ audioData, config, onRestart }: Props) {
  const [format, setFormat] = useState<ExportFormat>("mp4")
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle")
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function handleExport() {
    setError("")
    setStatus("processing")
    setJobId(null)
    stopPolling()

    try {
      const job = await createExport(audioData.sourceFile, {
        format,
        style: config.style,
        aspectRatio: config.aspectRatio,
        primaryColor: config.primaryColor,
        backgroundColor: config.backgroundColor,
      })
      setJobId(job.job_id)

      pollRef.current = setInterval(async () => {
        try {
          const result = await pollStatus(job.job_id)
          if (result.status === "done") {
            stopPolling()
            setStatus("done")
          } else if (result.status === "error") {
            stopPolling()
            setStatus("error")
            setError(result.error ?? "Falha ao exportar. Tente novamente.")
          }
        } catch {
          stopPolling()
          setStatus("error")
          setError("Falha ao verificar status. Tente novamente.")
        }
      }, 2000)
    } catch (e) {
      setStatus("error")
      setError(e instanceof Error ? e.message : "Falha ao exportar. Tente novamente.")
    }
  }

  function handleDownload() {
    if (!jobId) return
    const anchor = document.createElement("a")
    anchor.href = getDownloadUrl(jobId)
    anchor.download = `waveform.${format}`
    anchor.click()
  }

  const isProcessing = status === "processing"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Formato</p>
        <div className="flex gap-3">
          {(["mp4", "gif"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFormat(item)}
              disabled={isProcessing}
              className={`rounded-full px-5 py-2 text-sm font-semibold uppercase transition ${
                format === item
                  ? "bg-cyan-400 text-zinc-950"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {isProcessing ? (
        <section>
          <p className="mb-2 text-sm text-cyan-300">Processando no servidor...</p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full animate-pulse bg-cyan-400" style={{ width: "60%" }} />
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isProcessing}
          className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing ? "Exportando..." : "Exportar"}
        </button>

        {status === "done" ? (
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Baixar {format.toUpperCase()}
          </button>
        ) : null}

        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Recomeçar
          </button>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

```bash
cd frontend && npx vitest run src/components/editor/StepExport.test.tsx
```

Esperado: todos `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/editor/StepExport.tsx frontend/src/components/editor/StepExport.test.tsx
git commit -m "feat: rewrite StepExport to POST to FastAPI backend with polling"
```

---

## Task 14: Frontend — Auth pages sem NextAuth

**Files:**
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/app/register/page.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/middleware.ts`
- Delete: `frontend/src/app/providers.tsx` (já feito em Task 11)

- [ ] **Step 1: Reescrever login/page.tsx**

```typescript
// frontend/src/app/login/page.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { login } from "@/lib/api-client"

function setAuthCookie(token: string) {
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
  localStorage.setItem("token", token)
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await login(email, password)
      setAuthCookie(data.token)
      window.location.href = "/app"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email ou senha inválidos.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-gray-900 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Entrar</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Reescrever register/page.tsx**

```typescript
// frontend/src/app/register/page.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { register } from "@/lib/api-client"

function setAuthCookie(token: string) {
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
  localStorage.setItem("token", token)
}

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await register(email, password, name)
      setAuthCookie(data.token)
      window.location.href = "/app"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar sua conta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Wave</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Criar conta</h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <input
            type="text"
            placeholder="Nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
          <input
            type="password"
            placeholder="Senha"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-400">
          Já tem conta?{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Criar middleware.ts (cookie-based)**

```typescript
// frontend/src/middleware.ts
import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value
  if (!token && req.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
}

export const config = {
  matcher: ["/app/:path*"],
}
```

- [ ] **Step 4: Atualizar layout.tsx — remover Providers**

```typescript
// frontend/src/app/layout.tsx
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Wave — Animações de áudio para podcasts",
  description: "Gere vídeos com ondas de áudio animadas para publicar nas redes sociais.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={geist.className}>
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Criar frontend/.env.local**

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 6: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: build sem erros de import (pode haver type warnings menores).

- [ ] **Step 7: Rodar todos os testes do frontend**

```bash
cd frontend && npx vitest run
```

Esperado: todos os testes passam ou são skipados (testes de arquivos removidos foram deletados em Task 11).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/login/page.tsx frontend/src/app/register/page.tsx \
        frontend/src/middleware.ts frontend/src/app/layout.tsx frontend/.env.local
git commit -m "feat: replace NextAuth with FastAPI JWT auth on frontend"
```

---

## Task 15: Docker Compose + arquivos de ambiente

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `.env.example`

- [ ] **Step 1: Criar backend/Dockerfile**

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Criar docker-compose.yml**

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
    volumes:
      - /tmp:/tmp

  frontend:
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

- [ ] **Step 3: Criar .env.example na raiz**

```bash
# .env.example (raiz)
# Copie para backend/.env e preencha:
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-turso-token
JWT_SECRET=generate-with-openssl-rand-hex-32
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 4: Testar Docker Compose (backend)**

```bash
cp .env.example backend/.env  # edite com valores reais ou use defaults locais
docker compose up backend --build
```

Em outro terminal:
```bash
curl http://localhost:8000/health
```

Esperado: `{"status":"ok"}`.

- [ ] **Step 5: Commit final**

```bash
git add docker-compose.yml backend/Dockerfile .env.example
git commit -m "feat: add Docker Compose and Dockerfile for backend"
```

---

## Verificação Final

- [ ] Backend: `cd backend && pytest -v` — todos passam
- [ ] Frontend: `cd frontend && npx vitest run` — todos passam
- [ ] Backend sobe: `cd backend && uvicorn app.main:app --reload --port 8000`
- [ ] Frontend sobe: `cd frontend && npm run dev`
- [ ] Fluxo manual: upload de áudio → exportar → polling → download
