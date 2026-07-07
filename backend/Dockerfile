FROM python:3.11-slim

WORKDIR /app

# Railway's Nix environment marks Python as externally managed
# Remove the marker to allow pip install
RUN rm -f /usr/lib/python3.11/EXTERNALLY-MANAGED /usr/lib/python3.11/site-packages/EXTERNALLY-MANAGED /etc/nix/EXTERNALLY-MANAGED 2>/dev/null; \
    python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
