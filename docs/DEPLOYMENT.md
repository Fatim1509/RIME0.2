# RIME Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose 2.x
- Node.js 18+ (for local development)
- Python 3.11+ (for screen service)
- Git

## Environment Setup

1. **Clone the repository:**
```bash
git clone https://github.com/rime-ai/rime.git
cd rime
```

2. **Configure environment variables:**
```bash
cp infrastructure/.env.example infrastructure/.env
```

Edit `infrastructure/.env` with your API keys:
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional (for full features)
PINECONE_API_KEY=your_pinecone_key
SERPER_API_KEY=your_serper_key
GITHUB_TOKEN=your_github_token
SLACK_BOT_TOKEN=your_slack_token
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

Deploy the entire stack with one command:

```bash
cd infrastructure
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- Screen capture service
- Core engine
- Dashboard
- Nginx reverse proxy

**Access points:**
- Dashboard: http://localhost
- API: http://localhost/api
- Health: http://localhost/health

### Option 2: Local Development

Start services individually for development:

**1. Start infrastructure:**
```bash
cd infrastructure
docker-compose up -d postgres redis
```

**2. Start core engine:**
```bash
cd services/core-engine
npm install
npm run dev
```

**3. Start screen service:**
```bash
cd services/screen-service
pip install -r requirements.txt
uvicorn capture:app --reload
```

**4. Start dashboard:**
```bash
cd apps/dashboard
npm install
npm run dev
```

**Access points:**
- Dashboard: http://localhost:3000
- Core Engine: http://localhost:3001
- Screen Service: http://localhost:8000

### Option 3: Production Deployment

#### Vercel (Dashboard)

```bash
cd apps/dashboard
vercel --prod
```

Set environment variables in Vercel:
- `NEXT_PUBLIC_API_URL`: Your API URL
- `NEXT_PUBLIC_WS_URL`: Your WebSocket URL

#### Railway/Render (Core Engine)

```bash
cd services/core-engine
railway up
```

Or use the Dockerfile for Render:
```bash
cd services/core-engine
docker build -t rime-core .
```

#### Fly.io (Screen Service)

```bash
cd services/screen-service
fly deploy
```

## Configuration

### Core Engine

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 3001 |
| `GEMINI_API_KEY` | Google AI API key | required |
| `DATABASE_URL` | PostgreSQL connection | required |
| `REDIS_URL` | Redis connection | required |
| `ENABLE_MOCK` | Enable mock mode | true |

### Screen Service

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 8000 |
| `CAPTURE_INTERVAL` | Screenshot interval (ms) | 3000 |
| `SCREENSHOT_QUALITY` | JPEG quality (1-100) | 85 |
| `MAX_SCREENSHOTS` | Screenshot history size | 50 |

### Dashboard

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Core engine API URL | http://localhost:3001 |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | ws://localhost:3001 |

## SSL/TLS

For production, enable HTTPS:

### Using Let's Encrypt with Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name rime.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/rime.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rime.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://dashboard:3000;
    }

    location /api/ {
        proxy_pass http://core-engine:3001/api/;
    }
}
```

## Monitoring

### Health Checks

All services expose health endpoints:
- Core Engine: `GET /health`
- Screen Service: `GET /health`

### Logging

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f core-engine
```

### Metrics

Prometheus metrics available at:
- Core Engine: `GET /metrics`

## Backup & Recovery

### Database Backup

```bash
# Backup
docker exec rime-postgres pg_dump -U rime rime > backup.sql

# Restore
docker exec -i rime-postgres psql -U rime rime < backup.sql
```

### Vector Store Backup

Pinecone data is automatically backed up. For local fallback:
```bash
# Export memories
curl http://localhost:3001/api/memory/export > memories.json

# Import memories
curl -X POST http://localhost:3001/api/memory/import -d @memories.json
```

## Troubleshooting

### Common Issues

**1. Services won't start:**
```bash
# Check logs
docker-compose logs

# Restart
docker-compose restart
```

**2. Database connection failed:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
```

**3. Screen capture not working:**
- Check if running in container with display access
- Enable mock mode: `ENABLE_MOCK=true`

**4. Gemini API errors:**
- Verify API key is set
- Check API quota
- Enable mock mode for testing

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug docker-compose up
```

## Security Checklist

- [ ] Change default JWT secret
- [ ] Enable HTTPS in production
- [ ] Set up firewall rules
- [ ] Rotate API keys regularly
- [ ] Enable rate limiting
- [ ] Review CORS settings
- [ ] Set up monitoring alerts

## Scaling

### Horizontal Scaling

Scale core engine:
```yaml
# docker-compose.yml
services:
  core-engine:
    deploy:
      replicas: 3
```

Use Redis for session sharing between instances.

### Database Scaling

Set up read replicas:
```bash
# Primary
DATABASE_URL=postgresql://rime:pass@primary:5432/rime

# Read replicas
DATABASE_URL_READ=postgresql://rime:pass@replica:5432/rime
```

## Updates

### Rolling Updates

```bash
# Pull latest
git pull origin main

# Rebuild
docker-compose build

# Restart with zero downtime
docker-compose up -d --no-deps --scale core-engine=2 core-engine
docker-compose up -d --scale core-engine=1 core-engine
```

### Database Migrations

```bash
# Run migrations
docker-compose exec core-engine npm run migrate
```

## Support

For deployment support:
- GitHub Issues: https://github.com/rime-ai/rime/issues
- Discord: https://discord.gg/rime
- Documentation: https://docs.rime.ai
