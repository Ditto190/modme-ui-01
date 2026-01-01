# Use the official Microsoft DevContainers base image with Node.js and Python
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NVM_DIR=/usr/local/share/nvm
ENV NODE_VERSION=22.9.0
ENV PYTHON_VERSION=3.12

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

# Configure user (vscode is created by base image)
USER vscode

# Install nvm and Node.js for vscode user
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    && bash -c "source ${NVM_DIR}/nvm.sh && nvm install ${NODE_VERSION} && nvm use ${NODE_VERSION} && nvm alias default ${NODE_VERSION}"

# Set up environment for vscode user
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:${PATH}"

# Install global npm packages that might be useful
RUN bash -c "source ${NVM_DIR}/nvm.sh && npm install -g npm@latest"

# Create workspace directory
RUN mkdir -p /workspaces

# Set working directory
WORKDIR /workspaces

# Switch back to root for final setup
USER root

# Install uv for all users
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
RUN cp /root/.cargo/bin/uv /usr/local/bin/uv

# Set the default user back to vscode
USER vscode

# Set up shell environment
RUN echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc \
    && echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc \
    && echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc

CMD ["/bin/bash"]
