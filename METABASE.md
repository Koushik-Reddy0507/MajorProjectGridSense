# Metabase Setup Guide (No Tokens Required)

Metabase is a free, open-source analytics tool that requires **no API tokens**. Everything is done through the web UI.

## Quick Start

### 1. Start Metabase
```bash
docker-compose up -d metabase
# Wait 30 seconds for startup, then open http://localhost:3000
```

### 2. Initial Setup (One-time)
When you first open http://localhost:3000:
1. **Welcome screen** → Click "Let's get started"
2. **Create admin account**:
   - Email: `admin@gridsense.io`
   - Password: `gridsense123`
   - Company name: GridSense
3. **Connect database**:
   - Select **PostgreSQL**
   - Host: `postgres`
   - Port: `5432`
   - Database: `gridsense`
   - Username: `gridsense`
   - Password: `gridsense` (or your set password)
   - Click **Save** → Let Metabase analyze tables
4. **Finish** → Dashboard ready!

### 3. Create Your First Dashboard
**Database → Browse Data → gridsense**
- Click any table (e.g., `demand_forecasts`)
- Visualize → Pick chart type
- **Save to dashboard** → Create new dashboard
- Repeat for more widgets

### Example Queries (Use Metabase Native Query Builder - No SQL needed!)

**Demand Over Time:**
- Table: `demand_forecasts`
- X-axis: `timestamp`
- Y-axis: Sum of `forecasted_demand`
- Visualization: Line chart

**Battery SOC Latest:**
- Table: `battery_analysis`
- Filter: Latest record
- Visualization: Number (gauge)

**Renewable Generation:**
- Table: `renewable_forecasts`
- X-axis: `timestamp`
- Y-axis: `solar_generation`, `wind_generation`
- Visualization: Stacked bar

## Security

- **No API tokens** - Everything is in the web UI
- **User management** - Invite team via email in Admin Settings
- **Permissions** - Control who sees which databases
- **Local storage** - Data never leaves your infrastructure (with H2 database)

## Migration from Grafana

If you were using Grafana:
- **Dashboards**: Recreate using Metabase's visual query builder (faster!)
- **Alerts**: Metabase has built-in alerts (Admin → Alerts)
- **Scheduled reports**: Email dashboards on schedule (Admin → Schedules)

## Advanced: Production Setup

For production, use PostgreSQL backend (not H2):
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

In `.env`:
```
METABASE_DB_TYPE=postgres
METABASE_DB_HOST=postgres
METABASE_DB_PORT=5432
METABASE_DB_NAME=metabase
METABASE_DB_USER=metabase
METABASE_DB_PASSWORD=strong-password
```

## Default Login
- **Email**: `admin@gridsense.io`
- **Password**: `gridsense123`

Change these in Admin Settings after first login!