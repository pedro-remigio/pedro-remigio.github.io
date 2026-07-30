#!/bin/bash
# Script de configuração inicial de uma instância EC2 (Amazon Linux 2023)
# pra instalar Docker + Docker Compose e subir o backend.
#
# Como usar (depois de criar a instância e conectar via SSH):
#   1. git clone https://github.com/pedro-remigio/pedro-remigio.github.io
#   2. cd pedro-remigio.github.io/backend
#   3. cp .env.docker.example .env   (e edite os valores reais)
#   4. bash scripts/ec2-setup.sh
#   5. Saia e reconecte via SSH
#   6. cd pedro-remigio.github.io/backend && docker compose up -d --build
#
# Usuário padrão do Amazon Linux: ec2-user

set -e

echo "======================================="
echo "  Remigio Eventos — setup EC2"
echo "======================================="

echo ""
echo "Atualizando pacotes..."
sudo dnf update -y

echo ""
echo "Instalando Docker..."
sudo dnf install -y docker

echo ""
echo "Iniciando e habilitando o serviço Docker..."
sudo systemctl start docker
sudo systemctl enable docker

echo ""
echo "Instalando Docker Compose V2..."
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo ""
echo "Liberando o usuário ec2-user para usar Docker sem sudo..."
sudo usermod -aG docker ec2-user

echo ""
echo "Instalando git (caso não esteja instalado)..."
sudo dnf install -y git

echo ""
echo "======================================="
echo "  Instalação concluída!"
echo "======================================="
echo ""
echo "IMPORTANTE: Saia e reconecte via SSH para aplicar o grupo 'docker'."
echo ""
echo "Depois reconectar, rode:"
echo "  cd pedro-remigio.github.io/backend"
echo "  docker compose up -d --build"
echo ""
