FROM python:3.14-slim

# Install ffmpeg and curl (for healthcheck)
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies first (layer caching)
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application
COPY app/ ./app/

# Create data/uploads/outputs dirs
RUN mkdir -p data uploads outputs

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
