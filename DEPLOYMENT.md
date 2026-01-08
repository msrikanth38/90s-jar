# 90's JAR - Deployment Guide for Render

## Prerequisites
- A [Render](https://render.com) account
- A [GitHub](https://github.com) account

## Deployment Steps

### Option 1: Blueprint Deployment (Recommended)

1. **Push code to GitHub:**
   ```bash
   cd 90s_JAR
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/90s-jar.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **New** → **Blueprint**
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` and create:
     - A PostgreSQL database (`jar-database`)
     - A web service (`90s-jar`)
   - Click **Apply** to deploy

3. **Wait for deployment** (5-10 minutes for first deploy)

### Option 2: Manual Deployment

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → **New** → **PostgreSQL**
   - Name: `jar-database`
   - Plan: Free
   - Click **Create Database**
   - Copy the **Internal Database URL**

2. **Create Web Service:**
   - Go to Render Dashboard → **New** → **Web Service**
   - Connect your GitHub repository
   - Configure:
     - Name: `90s-jar`
     - Environment: `Python`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `gunicorn wsgi:app`
   - Add Environment Variable:
     - Key: `DATABASE_URL`
     - Value: (paste the Internal Database URL from step 1)
   - Click **Create Web Service**

## How the Database Works

- **Production (Render):** Uses PostgreSQL for persistent storage
- **Local Development:** Uses SQLite (`jar_database.db`)
- **Data is automatically migrated:** When you deploy, the app creates tables and sample data if needed
- **Your data persists:** Unlike SQLite on Render's free tier, PostgreSQL data survives deploys

## Verify Deployment

After deployment, visit your app URL and check:
- `https://your-app.onrender.com/api/debug` - Shows database status
- Should show: `"using_postgres": true`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Render) |
| `PORT` | Server port (auto-set by Render) |

## Updating the App

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. Render automatically redeploys

## Troubleshooting

### Data not persisting?
- Check `/api/debug` endpoint
- Ensure `DATABASE_URL` is set in Render environment variables
- Verify PostgreSQL database is connected

### App not loading?
- Check Render logs for errors
- Ensure all files are committed to GitHub
- Verify `requirements.txt` includes all dependencies

## Support

📞 Phone: +1 6822742570
📧 Business: 90's JAR - Homemade Sankranti Snacks
