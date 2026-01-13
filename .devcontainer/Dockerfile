# Use the official Microsoft DevContainers base image
# Node.js and Python are installed via devcontainer features (see devcontainer.json)
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies only
# Node.js and Python are handled by devcontainer features
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager) system-wide
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && cp /root/.local/bin/uv /usr/local/bin/uv 2>/dev/null || cp /root/.cargo/bin/uv /usr/local/bin/uv 2>/dev/null || true

# Create workspace directory
RUN mkdir -p /workspaces

# Set working directory
WORKDIR /workspaces

# Keep vscode as the default user (created by base image)
USER vscode

CMD ["/bin/bash"]
