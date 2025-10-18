# Backend Service Management System

**Complete solution for running the Wealth Wars backend with high reliability and easy restartability.**

## 🎯 Overview

This system provides multiple ways to run and manage the backend service, each suited for different environments:

1. **Service Control Script** - Simple, for development
2. **PM2 Process Manager** - Advanced, for production
3. **Docker Compose** - Containerized, full stack
4. **Systemd Service** - Linux native, auto-start
5. **Health Monitoring** - Built-in health checks

## 🚀 Quick Start

### One-Line Setup

```bash
./setup.sh
```

This interactive script will:
- ✅ Install dependencies
- ✅ Setup environment file
- ✅ Build Anchor program
- ✅ Generate Prisma client
- ✅ Sync database schema
- ✅ Configure service scripts

### Start the Service

```bash
./scripts/service.sh start
```

### Check Status

```bash
./scripts/service.sh status
./scripts/service.sh logs
```

## 📦 What's Included

### Core Services

| Component | Description | Location |
|-----------|-------------|----------|
| **ServiceManager** | Lifecycle management | `src/services/service-manager.ts` |
| **HealthMonitor** | Health checks | `src/services/health-monitor.ts` |
| **Start Script** | Service entry point | `src/start-services.ts` |

### Deployment Options

| Method | File | Best For |
|--------|------|----------|
| **Control Script** | `scripts/service.sh` | Development, simple servers |
| **PM2 Config** | `ecosystem.config.js` | Production with monitoring |
| **Docker Compose** | `docker-compose.yml` | Containerized deployments |
| **Systemd** | `deployment/wealth-wars-backend.service` | Linux production servers |

### Documentation

| Document | Purpose |
|----------|---------|
| **OPERATIONS.md** | Complete operations guide |
| **PHASE3_PROGRESS.md** | Development progress tracker |
| **setup.sh** | Interactive setup script |

## 🔧 Service Manager Features

### Automatic Initialization

```typescript
const manager = new ServiceManager({
  authorityKeypair: keypair,
  enableHealthMonitor: true,
  healthCheckIntervalMs: 30000,
});

await manager.start();
```

The ServiceManager automatically:
1. ✅ Connects to database (Prisma)
2. ✅ Connects to Solana RPC
3. ✅ Loads Anchor program
4. ✅ Initializes all lotto services
5. ✅ Starts health monitoring
6. ✅ Sets up graceful shutdown handlers

### Graceful Shutdown

Handles all shutdown signals (SIGTERM, SIGINT, SIGQUIT):
- Stops health monitoring
- Runs custom shutdown handlers
- Disconnects database
- Cleans up resources
- Exits cleanly

### Error Recovery

```typescript
// Uncaught exceptions and unhandled rejections trigger graceful shutdown
process.on('uncaughtException', async (error) => {
  await manager.stop();
  process.exit(1);
});
```

## 🏥 Health Monitoring

### Automated Health Checks

Every 30 seconds (configurable):
- ✅ Solana RPC connectivity
- ✅ Database connectivity
- ✅ Program deployment status

### Health Status API

```bash
curl http://localhost:3000/health
```

Response includes:
- Overall system status
- Individual component health
- Detailed diagnostics
- System uptime

### Status Levels

- **healthy**: All systems operational
- **degraded**: Non-critical issues
- **unhealthy**: Critical failures

## 📋 Usage Examples

### Development Workflow

```bash
# Setup
./setup.sh

# Start service
./scripts/service.sh start

# Make changes to code...

# Restart
./scripts/service.sh restart

# Check logs
./scripts/service.sh logs
```

### Production with PM2

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start ecosystem.config.js

# Save and auto-start on boot
pm2 save
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs
```

### Docker Deployment

```bash
# Start full stack
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Restart backend only
docker-compose restart backend

# Stop all
docker-compose down
```

### Linux Systemd

```bash
# Install service
sudo cp deployment/wealth-wars-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wealth-wars-backend

# Start
sudo systemctl start wealth-wars-backend

# Check status
sudo systemctl status wealth-wars-backend

# View logs
sudo journalctl -u wealth-wars-backend -f
```

## 🔄 Restart Strategies

### Quick Restart

```bash
./scripts/service.sh restart
```

### PM2 Zero-Downtime

```bash
pm2 reload wealth-wars-backend
```

### Docker Rolling Update

```bash
docker-compose up -d --no-deps --build backend
```

### Systemd Restart with Rate Limit

```bash
sudo systemctl restart wealth-wars-backend
# Limited to 5 restarts per 400 seconds
```

## 🛡️ Reliability Features

### Automatic Restarts

All deployment methods include automatic restart on failure:

- **service.sh**: Manual restart required
- **PM2**: Up to 10 restarts/minute with backoff
- **Docker**: Unless-stopped restart policy
- **Systemd**: Always restart with 10s delay, rate-limited

### Health Check Recovery

Health monitor detects issues and logs warnings:

```typescript
if (health.status !== 'healthy') {
  console.warn('[HealthMonitor] System status:', status);
  // External monitoring can trigger restart
}
```

### Database Reconnection

Prisma automatically reconnects on connection loss.

### RPC Connection Management

Connection health checks ensure RPC availability before operations.

## 📊 Monitoring Integrations

### Built-in Metrics

- System uptime
- Component status
- Last health check time
- Resource usage (with PM2)

### External Monitoring

Health endpoint (`/health`) compatible with:
- Prometheus
- Datadog
- New Relic
- Custom monitoring scripts

Example monitoring script:

```bash
#!/bin/bash
while true; do
  STATUS=$(curl -s http://localhost:3000/health | jq -r '.status')
  if [ "$STATUS" != "healthy" ]; then
    # Send alert
    ./scripts/service.sh restart
  fi
  sleep 60
done
```

## 🔐 Security Features

### Systemd Security

- NoNewPrivileges
- PrivateTmp
- ProtectSystem=strict
- ProtectHome
- Resource limits

### Container Security

- Non-root user
- Read-only filesystem where possible
- Network isolation
- Secret management via environment

### Environment Variables

Secrets stored in `.env` file, never in code:
- `AUTHORITY_SECRET_KEY`
- `DATABASE_URL`
- API keys

## 🎛️ Configuration

### Service Manager

```typescript
new ServiceManager({
  authorityKeypair: keypair,        // Required
  enableHealthMonitor: true,        // Default: true
  healthCheckIntervalMs: 30000,     // Default: 30s
})
```

### PM2

Edit `ecosystem.config.js`:

```javascript
max_restarts: 10,
min_uptime: '10s',
restart_delay: 5000,
max_memory_restart: '2G',
```

### Docker Compose

Edit `docker-compose.yml`:

```yaml
environment:
  SOLANA_RPC_URL: https://api.devnet.solana.com
  # Other vars...
```

### Systemd

Edit `/etc/systemd/system/wealth-wars-backend.service`:

```ini
RestartSec=10
MemoryLimit=2G
```

## 📚 Complete Documentation

See **[OPERATIONS.md](./packages/backend/OPERATIONS.md)** for:
- Detailed usage instructions
- Troubleshooting guide
- Best practices
- Performance tuning
- Emergency procedures

## ✅ Checklist for Production

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Solana program deployed
- [ ] Health monitoring enabled
- [ ] Log rotation configured
- [ ] Automatic restart enabled
- [ ] Monitoring alerts set up
- [ ] Backup procedures in place
- [ ] Documentation reviewed
- [ ] Tested restart procedures

## 🆘 Quick Troubleshooting

### Service Won't Start

```bash
# Check configuration
cat packages/backend/.env | grep -v '^#'

# Check database
cd packages/backend && npx prisma db push

# Check RPC
curl -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

### Service Crashes

```bash
# View logs
./scripts/service.sh logs
# OR
pm2 logs wealth-wars-backend --lines 100
```

### Emergency Restart

```bash
./scripts/service.sh restart
```

## 📞 Support

For issues:
1. Check logs
2. Verify environment configuration  
3. Test components individually
4. Review OPERATIONS.md
5. Check health endpoint

---

**Built with reliability and easy restartability in mind. Your backend service will stay running smoothly!** 🚀
