FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY backend/ .

# Expose port
EXPOSE 8000

# Railway injects PORT env var — must use $PORT for health checks
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
