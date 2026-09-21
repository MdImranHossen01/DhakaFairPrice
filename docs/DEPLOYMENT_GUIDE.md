# Swapnobaz – Production VPS Deployment & Configuration Manual

This guide walks through deploying the **Swapnobaz** Multi-Tenant Next.js platform on a Linux VPS (Ubuntu 22.04 / 24.04 LTS) using **Node.js, PM2, Nginx, SSL (Let's Encrypt Certbot), Redis, and MongoDB Atlas**.

---

## 🖥️ 1. VPS Server Requirements

- **Operating System:** Ubuntu 22.04 LTS or 24.04 LTS
- **CPU:** 2 vCPU minimum (4 vCPU recommended for high concurrency)
- **RAM:** 4 GB RAM minimum (8 GB recommended for Redis + BullMQ workers)
- **Storage:** 40 GB+ NVMe SSD
- **Ports to open:** `22` (SSH), `80` (HTTP), `443` (HTTPS)

---

## ⚙️ 2. Server Initialization & Essential Tools

Connect to your VPS via SSH:
```bash
ssh root@your_server_ip
```

Update packages and install essential utilities:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx redis-server
```

Configure Firewall (UFW):
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Enable Redis:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## 📦 3. Install Node.js & PM2

Install Node.js LTS (v20.x):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify versions:
```bash
node -v   # v20.x.x
npm -v    # 10.x.x
```

Install PM2 globally for process management:
```bash
sudo npm install -g pm2
```

---

## 🚀 4. Clone Repository & Setup Project

Create application directory:
```bash
sudo mkdir -p /var/www/swapnobaz
sudo chown -R $USER:$USER /var/www/swapnobaz
git clone https://github.com/your-username/Swapnobaz.git /var/www/swapnobaz
cd /var/www/swapnobaz
```

Install production dependencies:
```bash
npm install --production=false
```

Create production environment configuration:
```bash
nano .env.local
```

Paste your production secrets:
```env
NODE_ENV=production
PORT=3000

# Base Domain
NEXT_PUBLIC_BASE_DOMAIN=swapnobaz.com
NEXT_PUBLIC_APP_URL=https://swapnobaz.com

# Database Connection
MONGODB_URI=mongodb+srv://<db_user>:<db_pass>@cluster0.mongodb.net/swapnobaz?retryWrites=true&w=majority

# NextAuth / Auth.js
NEXTAUTH_SECRET=generate_strong_secret_with_openssl_rand_hex_32
NEXTAUTH_URL=https://swapnobaz.com

# Queue Redis
REDIS_URL=redis://127.0.0.1:6379

# Google Gemini API (AI Chatbot & SEO)
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# Courier API Credentials (Default / Mother Fallback)
STEADFAST_API_KEY=
STEADFAST_SECRET_KEY=
PATHAO_CLIENT_ID=
PATHAO_CLIENT_SECRET=
PATHAO_USERNAME=
PATHAO_PASSWORD=
PATHAO_STORE_ID=
REDX_API_TOKEN=

# BD Courier Fraud Checker API
BD_COURIER_API_KEY=
```

Build the Next.js production bundle:
```bash
npm run build
```

---

## 🔄 5. PM2 Process Configuration

Create an `ecosystem.config.js` file inside `/var/www/swapnobaz`:
```javascript
module.exports = {
  apps: [
    {
      name: 'swapnobaz-app',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/swapnobaz',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Start the application with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🌐 6. Nginx Reverse Proxy with Wildcard Subdomains

Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/swapnobaz
```

Add the following block to support both apex domain (`swapnobaz.com`), `www`, and all reseller subdomains (`*.swapnobaz.com`):

```nginx
server {
    listen 80;
    server_name swapnobaz.com www.swapnobaz.com *.swapnobaz.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable configuration and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/swapnobaz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 7. SSL Installation (Wildcard Let's Encrypt)

To secure both the root domain and all reseller subdomains, obtain a wildcard certificate:

```bash
sudo certbot --nginx -d swapnobaz.com -d www.swapnobaz.com
```

For wildcard DNS challenge (e.g. `*.swapnobaz.com`):
```bash
sudo certbot certonly --manual --preferred-challenges dns -d swapnobaz.com -d "*.swapnobaz.com"
```
Follow the interactive prompt to add the TXT record in your DNS provider (Cloudflare, Namecheap, etc.).

Auto-renewal verification:
```bash
sudo certbot renew --dry-run
```

---

## 💾 8. Automated MongoDB Backup Script

Set up daily automated backups to protect client data:
```bash
mkdir -p /var/backups/mongodb
sudo nano /usr/local/bin/backup-mongodb.sh
```

Script content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +"%Y-%m-%d_%H%M")
mongodump --uri="your_mongodb_uri_here" --out="$BACKUP_DIR/backup-$DATE"
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

Make executable and register in cron:
```bash
chmod +x /usr/local/bin/backup-mongodb.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-mongodb.sh") | crontab -
```

---

## 🏁 9. Deployment Verification
1. Access `https://swapnobaz.com` to confirm Mother storefront loads.
2. Login to `https://swapnobaz.com/login` using `imranshuvo101@gmail.com` (`Password123!`).
3. Navigate to `/admin/system-design` to test dynamic theme styling.
4. Verify subdomains (e.g., `reseller1.swapnobaz.com`).
