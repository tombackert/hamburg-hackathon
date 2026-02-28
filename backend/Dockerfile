FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy and install dependencies first (for layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Cloud Run sets PORT env var; default to 8080
ENV PORT=8080

# Run uvicorn (no --reload in production)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
