# GitLab AI Gateway Local Setup

This folder contains the setup files necessary to run the GitLab AI Gateway locally.

## Prerequisites
1. **Docker**: You must install [Docker](https://docs.docker.com/engine/install/#server) on your system.
2. **OpenSSL or Node.js**: You need a way to generate the required RSA 2048-bit keys for JWT signing. 

## Steps to Run

1. **Generate Keys**: 
   Since OpenSSL and Node are currently unavailable or restricted in this terminal, you must generate the keys manually or run the provided script in an authorized terminal.
   If you have Node.js installed, open an Administrator or authorized terminal and run:
   ```bash
   node generate_keys.js
   ```
   This will generate the 4 required `.key` files and populate the `.env` file with your keys.

   Alternatively, if you install OpenSSL, you can generate them manually:
   ```bash
   openssl genrsa -out duo_workflow_jwt.key 2048
   openssl genrsa -out duo_workflow_validation.key 2048
   openssl genrsa -out aigw_signing.key 2048
   openssl genrsa -out aigw_validation.key 2048
   ```
   Then manually update the `.env` file to contain these keys.

2. **Start the AI Gateway**:
   Once the `.env` file is fully populated with the RSA keys, start the gateway using Docker Compose:
   ```bash
   docker compose up -d
   ```

3. **Verify**:
   Access `http://localhost:5052/` in your browser. It should return `{"error":"No authorization header presented"}` if the gateway is successfully running.
