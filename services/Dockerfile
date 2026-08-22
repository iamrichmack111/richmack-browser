FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RICHMACK_DOWNLOADS=/downloads \
    RICHMACK_WORKDIR=/workspace

RUN useradd --create-home --uid 10001 richmack \
    && mkdir -p /app /downloads /workspace \
    && chown -R richmack:richmack /app /downloads /workspace

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY app /app/app

USER richmack
EXPOSE 8765
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8765", "--no-access-log"]
