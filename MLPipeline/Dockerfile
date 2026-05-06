FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app/MLPipeline

EXPOSE 8010

# Bootstrapping/training is triggered on-demand by the inference service if
# artifacts are missing. This keeps container startup reliable even when
# datasets/artifacts volumes are empty on first run.
CMD ["uvicorn", "inference_service.app:app", "--app-dir", "/app/MLPipeline/py", "--host", "0.0.0.0", "--port", "8010"]
