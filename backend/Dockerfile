FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY backend/ .

# Expose port
EXPOSE 8000

# Railway overrides CMD via startCommand in railway.json (uses $PORT)
