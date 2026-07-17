# ModMe devcontainer base — Node/Python via devcontainer features (see devcontainer.json)
FROM mcr.microsoft.com/devcontainers/base:ubuntu

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# uv (Python package manager) — system-wide
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && cp /root/.local/bin/uv /usr/local/bin/uv 2>/dev/null || cp /root/.cargo/bin/uv /usr/local/bin/uv 2>/dev/null || true

# lean-ctx and other user-local CLIs (node + vscode users)
ENV PATH="/home/node/.local/bin:/home/vscode/.local/bin:${PATH}"

RUN mkdir -p /workspaces

WORKDIR /workspaces

# remoteUser is `node` in devcontainer.json (created by the node feature at build time)
USER node

CMD ["/bin/bash"]
