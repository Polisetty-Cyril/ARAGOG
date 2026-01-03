# Multi-stage build for ARAGOG Medical AI Assistant
# This serves both React frontend and FastAPI backend

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend with frontend
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend to be served by FastAPI
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy model checkpoints and data
COPY medical_qa_checkpoints/ ./medical_qa_checkpoints/

# Expose port (Hugging Face expects 7860)
EXPOSE 7860

# Environment variable for port
ENV PORT=7860

# Set working directory to backend
WORKDIR /app/backend

# Run the application on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
