#!/usr/bin/env bash
# Create passwordless modme-agent WSL profile for multi-agent workspaces.
# Optional: DYLAN_PASSWORD=<secret> to set/reset the dylan account password.
set -euo pipefail

AGENT_USER="${AGENT_USER:-modme-agent}"

if ! id -u "$AGENT_USER" >/dev/null 2>&1; then
  useradd -m -u 1000 -G sudo,adm,users -s /bin/bash "$AGENT_USER"
fi

passwd -d "$AGENT_USER" || true
printf '%s ALL=(ALL) NOPASSWD:ALL\n' "$AGENT_USER" > /etc/sudoers.d/010-modme-agent
chmod 440 /etc/sudoers.d/010-modme-agent

if id -u dylan >/dev/null 2>&1 && [ -n "${DYLAN_PASSWORD:-}" ]; then
  echo "dylan:${DYLAN_PASSWORD}" | chpasswd
fi

if ! grep -q '^\[boot\]' /etc/wsl.conf 2>/dev/null; then
  cat > /etc/wsl.conf <<'EOF'
[boot]
systemd=true

[interop]
enabled=true
appendWindowsPath=true
EOF
fi

if grep -q '^default=' /etc/wsl.conf 2>/dev/null; then
  sed -i "s/^default=.*/default=${AGENT_USER}/" /etc/wsl.conf
elif grep -q '^\[user\]' /etc/wsl.conf 2>/dev/null; then
  sed -i "/^\[user\]/a default=${AGENT_USER}" /etc/wsl.conf
else
  cat >> /etc/wsl.conf <<EOF

[user]
default=${AGENT_USER}
EOF
fi

sudo -u "$AGENT_USER" -H bash -lc 'mkdir -p ~/.local/bin && curl -fsSL https://releases.jetify.com/devbox -o ~/.local/bin/devbox && chmod +x ~/.local/bin/devbox && ~/.local/bin/devbox version'

getent passwd "$AGENT_USER" dylan || true
