#!/bin/bash
set -e

dnf install -y nginx

rm -f /etc/nginx/conf.d/default.conf

# Comment out the default server block in nginx.conf to avoid conflict
sed -i '/^    server {/,/^    }$/s/^/#/' /etc/nginx/nginx.conf

cat > /etc/nginx/conf.d/apps.conf << 'NGINX_CONF'
server {
    listen 80;
    server_name _;
    server_tokens off;
    client_max_body_size 10m;

    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /trpc/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
NGINX_CONF

systemctl enable nginx
systemctl start nginx
systemctl status nginx
curl -sf http://localhost/api/health && echo "Health OK" || echo "Health check failed (app may not be running yet)"
