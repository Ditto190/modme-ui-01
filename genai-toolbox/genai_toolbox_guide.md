The GenAI Toolbox (also known as MCP Toolbox for Databases) is a powerful bridge that allows AI agents like AntiGravity to securely interact with your local or cloud databases.

What is it?
Think of it as a "translator" or "adapter". AntiGravity speaks "Model Context Protocol" (MCP), and your databases speak SQL. The GenAI Toolbox sits in the middle:

It manages database connections (pooling, authentication).
It exposes specific "Tools" to the agent (e.g., find_users_by_email instead of raw SQL access).
It ensures security by only allowing pre-defined interactions if desired.
How to use it with AntiGravity

1. Install the Toolbox
   You can run it using npx (Node.js) or download a binary.

# Quick start with npx

npx @toolbox-sdk/server --tools-file tools.yaml 2. Configure Your Tools (tools.yaml)
Create specific actions you want AntiGravity to perform. You define Sources (your DB) and Tools (actions).

Example tools.yaml:

sources:
my-db:
kind: postgres
host: localhost
port: 5432
database: my_app
user: ${DB_USER}
password: ${DB_PASS}
tools:
search_products:
kind: postgres-sql
source: my-db
description: "Search for products by name"
parameters: - name: search_term
type: string
description: "The partial name to search for"
statement: "SELECT \* FROM products WHERE name ILIKE '%' || $1 || '%'" 3. Connect to AntiGravity
Once the Toolbox server is running (usually on a local port or via stdio), AntiGravity can "see" these tools.

If you are using a standard MCP-compatible environment (like VSCode with an MCP extension or a CLI agent):

Add the Toolbox as an MCP Server in your configuration.
Command: npx @toolbox-sdk/server --tools-file /absolute/path/to/tools.yaml 4. Just Ask!
Once connected, you don't need to write SQL. You can simply ask AntiGravity:

"Check the database for any products named 'SuperWidget'."

AntiGravity will:

See the search_products tool is available.
Call it with search_term='SuperWidget'.
Read the results from your database.
