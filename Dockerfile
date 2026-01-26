# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend & Runtime
# Use official Playwright image which includes all browser dependencies
FROM mcr.microsoft.com/playwright/python:v1.57.0-jammy

WORKDIR /app

# Setup Backend Environment
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy Backend Code
COPY backend/ ./backend/
COPY run.py ./

# Copy Frontend Build from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose Port
EXPOSE 8000

# Environment Variables
ENV HEADLESS=true
ENV PYTHONUNBUFFERED=1

# Run Command
CMD ["python", "run.py"]
