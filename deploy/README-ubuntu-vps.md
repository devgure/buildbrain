BuildBrain VPS deploy notes (Ubuntu)

Prereqs on VPS:
- Docker (and NVIDIA container toolkit for GPU hosts if using Donut GPU)
- docker-compose (optional)
- systemd (Ubuntu default)

Quick steps:
1. Clone repo onto VPS: `git clone <repo> /opt/buildbrain` and `cd /opt/buildbrain`
2. Build images (or use CI to build/publish images):

   ```bash
   cd /opt/buildbrain
   docker build -f backend/Dockerfile.prod -t buildbrain/backend:latest ./backend
   docker build -f frontend/Dockerfile.prod -t buildbrain/frontend:latest ./frontend
   docker build -f backend/ocr_donut/Dockerfile.prod -t buildbrain/donut:latest ./backend/ocr_donut
   docker build -f backend/ocr_donut/Dockerfile.gpu.prod -t buildbrain/donut-gpu:latest ./backend/ocr_donut
   docker build -f orchestrator/Dockerfile.prod -t buildbrain/orchestrator:latest ./orchestrator
   docker build -f orchestrator/temporal/Dockerfile.prod -t buildbrain/temporal-worker:latest ./orchestrator/temporal
   ```

3. Copy systemd unit files to `/etc/systemd/system/` and enable:

   ```bash
   sudo cp deploy/systemd/*.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable buildbrain-donut.service
   sudo systemctl enable buildbrain-temporal-worker.service
   sudo systemctl enable buildbrain-orchestrator.service
   # enable donut-gpu.service only on GPU hosts
   sudo systemctl enable buildbrain-donut-gpu.service
   sudo systemctl start buildbrain-orchestrator.service
   sudo systemctl start buildbrain-temporal-worker.service
   sudo systemctl start buildbrain-donut.service
      # Other services
      sudo systemctl enable qdrant.service
      sudo systemctl enable minio.service
      sudo systemctl enable kong.service
      sudo systemctl enable pinecone-stub.service
      sudo systemctl enable temporal-server.service
      sudo systemctl start qdrant.service
      sudo systemctl start minio.service
      sudo systemctl start kong.service
      sudo systemctl start pinecone-stub.service
      sudo systemctl start temporal-server.service
   ```

4. Nginx: copy `deploy/nginx/buildbrain.conf` into `/etc/nginx/sites-available/` and symlink to `sites-enabled`, then restart nginx.

Notes:
- GPU hosts require NVIDIA drivers and NVIDIA Container Toolkit; see https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
- For production, consider using a process / container orchestrator (kubernetes, docker swarm) and an automated CI/CD pipeline.
