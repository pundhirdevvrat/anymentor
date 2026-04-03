#!/bin/bash

# Script to automate deployment on AWS EC2 Ubuntu

# Prompt for user inputs
read -p "Enter your domain name: " DOMAIN
read -p "Enter your email address: " EMAIL
read -sp "Enter your database password: " DB_PASSWORD
echo

# Update the system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Clone the repository
git clone https://github.com/pundhirdevvrat/anymentor.git
cd anymentor

# Build Docker containers
sudo docker-compose up --build -d

# Set up SSL using Certbot
sudo apt install -y certbot
sudo apt install -y python3-certbot-nginx

# Configure NGINX for SSL
sudo bash -c "cat > /etc/nginx/sites-available/$DOMAIN << EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:YOUR_APP_PORT;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL"

# Enable the NGINX configuration
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL certificate
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email -q

# Print completion message
echo "Deployment completed successfully!"