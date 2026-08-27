#!/bin/bash
set -e

echo "========================================================="
echo " 🚀 MEMULAI SETUP OTOMATIS SERVER GIS KOTA LUBUKLINGGAU"
echo "    DISKOMINFOTIKSAN KOTA LUBUKLINGGAU"
echo "========================================================="

# 1. Update OS & Paket Dasar
echo "📦 [1/6] Memperbarui paket sistem Ubuntu..."
sudo apt-get update -y
sudo apt-get install -y curl git ufw nginx build-essential

# 2. Buka Firewall Port di Server
echo "🛡️ [2/6] Mengonfigurasi firewall server (Port 22, 80, 443, 3000)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw allow 3000/tcp || true
echo "y" | sudo ufw enable || true

# 3. Install Node.js 20 LTS & PM2
echo "⚡ [3/6] Menginstal Node.js 20 LTS dan Process Manager PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "Node.js Version: $(node -v)"
echo "NPM Version: $(npm -v)"

# 4. Clone / Deploy Repository
echo "📂 [4/6] Mengunduh source code aplikasi web GIS..."
TARGET_DIR="/var/www/gis-lubuklinggau"
sudo mkdir -p "$TARGET_DIR"
sudo chown -R $USER:$USER "$TARGET_DIR"

if [ -d "$TARGET_DIR/.git" ]; then
  cd "$TARGET_DIR"
  git pull origin main
else
  git clone https://github.com/Rudin1409/gis-infrastructure-mapping-system.git "$TARGET_DIR"
  cd "$TARGET_DIR"
fi

# Salin / Buat konfigurasi .env.local jika belum ada
cat << 'EOF' > .env.local
NEXT_PUBLIC_APP_NAME="Sistem Informasi Spasial Infrastruktur Jaringan & Utilitas"
NEXT_PUBLIC_AGENCY_NAME="DISKOMINFOTIKSAN Kota Lubuklinggau"
GOOGLE_SHEET_ID="1P1yN3c0x7VzX8L7i0G5e0N1m4Q2_example"
NEXT_PUBLIC_DEFAULT_LAT=-3.2964
NEXT_PUBLIC_DEFAULT_LNG=102.8617
PORT=3000
NODE_ENV=production
EOF

echo "📥 Memasang dependencies..."
npm install

echo "🏗️ Membangun aplikasi Next.js (Build Production)..."
npm run build

# 5. Jalankan Aplikasi dengan PM2 Auto-Restart
echo "🔄 [5/6] Menjalankan aplikasi dengan PM2 (Auto Restart 24/7)..."
pm2 delete gis-app 2>/dev/null || true
pm2 start npm --name "gis-app" -- start -- -p 3000
pm2 save

# Setup PM2 Startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

# 6. Konfigurasi Nginx Web Server (Port 80 -> Port 3000)
echo "🌐 [6/6] Mengonfigurasi Nginx Reverse Proxy..."
sudo tee /etc/nginx/sites-available/gis-lubuklinggau > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/gis-lubuklinggau /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "========================================================="
echo " 🎉 ALHAMDULILLAH! INSTALASI DAN SETUP BERHASIL 100%!"
echo "    Aplikasi Web GIS sudah LIVE dan dapat diakses di:"
echo "    👉 http://103.176.78.221"
echo "========================================================="
