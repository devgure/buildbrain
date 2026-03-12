# BuildBrain Kubernetes Deployment Guide

## Overview
This guide describes how to deploy BuildBrain to a production Kubernetes cluster on AWS EKS.

## Prerequisites
1. AWS Account with EKS cluster (1.24+)
2. kubectl configured to access your cluster
3. Helm 3+ installed
4. cert-manager for TLS certificates
5. nginx-ingress controller
6. Prometheus for monitoring (optional)

## Cluster Setup

### 1. Create EKS Cluster (Terraform)
```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

### 2. Install Required Components

#### nginx-ingress
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --create-namespace \
  --values infra/helm/nginx-values.yaml
```

#### cert-manager
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

#### Prometheus
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace
```

## Deploy BuildBrain

### 1. Create Namespace and Secrets
```bash
kubectl apply -f infra/k8s/namespace.yaml
```

### 2. Update Secrets
Edit `infra/k8s/configmap.yaml` and set actual values:
- Database passwords
- API keys (SendGrid, Twilio, Firebase, etc.)
- JWT secret
- AWS credentials

```bash
kubectl apply -f infra/k8s/configmap.yaml
```

### 3. Deploy Databases
```bash
kubectl apply -f infra/k8s/postgres-deployment.yaml
kubectl apply -f infra/k8s/redis-deployment.yaml
```

Wait for PostgreSQL to be ready:
```bash
kubectl -n buildbrain-prod wait --for=condition=ready pod -l app=postgres --timeout=300s
```

### 4. Initialize Database
```bash
kubectl -n buildbrain-prod exec -it postgres-0 -- psql -U postgres -d buildbrain -f /migrations.sql
```

Or using Prisma:
```bash
kubectl -n buildbrain-prod exec -it api-gateway-0 -- npx prisma migrate deploy
```

### 5. Deploy Services
```bash
kubectl apply -k infra/k8s/
```

### 6. Deploy Monitoring
```bash
kubectl apply -f infra/k8s/monitoring.yaml
```

## Verification

### Check Pods
```bash
kubectl -n buildbrain-prod get pods
kubectl -n buildbrain-prod get svc
```

### Check Logs
```bash
kubectl -n buildbrain-prod logs -f deployment/api-gateway
```

### Check Ingress
```bash
kubectl -n buildbrain-prod get ingress
```

### Access Services
```bash
# Port-forward for local testing
kubectl -n buildbrain-prod port-forward svc/api-gateway 3000:3000

# Check API health
curl http://localhost:3000/health
```

## Scaling

### Manual Scaling
```bash
kubectl -n buildbrain-prod scale deployment api-gateway --replicas=5
```

### Auto-Scaling (HPA already configured)
Monitors CPU and memory usage, automatically scales based on metrics.

```bash
kubectl -n buildbrain-prod get hpa
```

## Monitoring

### Access Prometheus
```bash
kubectl -n monitoring port-forward svc/prometheus 9090:9090
# Visit http://localhost:9090
```

### Access Grafana (if installed)
```bash
kubectl -n monitoring port-forward svc/grafana 3000:3000
# Visit http://localhost:3000
```

## Backup & Recovery

### Database Backup
```bash
kubectl -n buildbrain-prod exec -it postgres-0 -- pg_dump -U postgres buildbrain > backup.sql
```

### Database Restore
```bash
kubectl -n buildbrain-prod exec -i postgres-0 -- psql -U postgres buildbrain < backup.sql
```

## Troubleshooting

### Pod Won't Start
```bash
kubectl -n buildbrain-prod describe pod <pod-name>
kubectl -n buildbrain-prod logs <pod-name>
```

### Database Connection Issues
```bash
# Test connection from pod
kubectl -n buildbrain-prod run -it --rm debug --image=postgres:13 -- \
  psql -h postgres -U postgres -d buildbrain
```

### DNS Issues
```bash
# Test DNS from pod
kubectl -n buildbrain-prod run -it --rm debug --image=busybox -- \
  nslookup postgres
```

## Production Checklist

- [ ] Database passwords changed from defaults
- [ ] API keys configured (SendGrid, Twilio, Firebase, AWS)
- [ ] JWT secret changed
- [ ] TLS certificates configured for custom domains
- [ ] Backups configured (automated snapshots)
- [ ] Monitoring and alerting configured
- [ ] Log aggregation setup (CloudWatch, ELK, Datadog)
- [ ] Security policies applied (NetworkPolicy, Pod Security Policy)
- [ ] Resource quotas and limits set
- [ ] Pod disruption budgets configured
- [ ] Auto-scaling policies configured
- [ ] Disaster recovery plan documented
- [ ] Security scanning (container images, dependencies)
- [ ] Load testing completed

## Update Images

```bash
# Build and push Docker images
docker build -t buildbrain/api-gateway:v1.0.1 services/api-gateway
docker push buildbrain/api-gateway:v1.0.1

# Update deployment
kubectl -n buildbrain-prod set image deployment/api-gateway \
  api-gateway=buildbrain/api-gateway:v1.0.1

# Watch rollout
kubectl -n buildbrain-prod rollout status deployment/api-gateway
```

## Uninstall

```bash
# Delete everything in namespace
kubectl delete namespace buildbrain-prod

# Delete ingress controller
helm uninstall nginx-ingress -n ingress-nginx
kubectl delete namespace ingress-nginx

# Delete cert-manager
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

## Support

For issues or questions:
1. Check Kubernetes events: `kubectl describe pod <pod-name>`
2. View logs: `kubectl logs <pod-name>`
3. Check resource usage: `kubectl top pods`
4. Review monitoring dashboards (Prometheus/Grafana)
5. Check application health endpoints

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Helm Documentation](https://helm.sh/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
