FROM python:3.11-slim

WORKDIR /app

# Install dependencies (supports build from repo root or backend/)
COPY requirements.txt backend/requirements.txt ./
RUN if [ -f backend/requirements.txt ]; then cp backend/requirements.txt .; fi && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code (supports both build contexts)
COPY . /app/
COPY backend/ /app/

# Expose port
EXPOSE 8000

# Railway injects PORT env var
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
