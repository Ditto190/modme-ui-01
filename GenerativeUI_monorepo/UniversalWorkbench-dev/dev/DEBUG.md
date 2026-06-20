# VS Code Debugging Guide

This project is fully configured for VS Code debugging with breakpoints, watch expressions, and hot reload.

## Quick Start

### Method 1: Using the Debug Panel (Recommended)

1. **Open VS Code Debug Panel**
   - Click the Run and Debug icon in the sidebar (or press `Cmd+Shift+D`)

2. **Select a Debug Configuration**
   - Choose from the dropdown at the top of the Debug panel:
     - **Debug API** - Debug the Fastify API server with breakpoints
     - **Debug Web (Vite)** - Debug the React app in Chrome
     - **Debug Agent** - Debug the agent service
     - **Debug Full Stack** - Debug API + Web together
     - **Debug Current Test File** - Debug the test file you're editing

3. **Start Debugging**
   - Press the green play button or `F5`
   - Set breakpoints by clicking in the gutter next to line numbers

### Method 2: Using Command Palette

1. Press `Cmd+Shift+P` to open Command Palette
2. Type "Debug: Select and Start Debugging"
3. Choose your configuration

## Available Debug Configurations

### 🚀 Debug API
Launches the API server with debugging enabled:
- Sets breakpoints in TypeScript files
- Hot reloads on file changes
- Shows console output in VS Code terminal
- Inspects variables, watch expressions, call stack

**Usage:**
```typescript
// apps/api/src/routes/users.ts
export async function userRoutes(server: FastifyInstance) {
  server.get('/api/users', async (request, reply) => {
    // Set a breakpoint here by clicking the line number gutter
    const users = await db.select().from(usersTable);
    return { users }; // Inspect 'users' variable when paused
  });
}
```

### 🌐 Debug Web (Vite)
Launches Chrome with React DevTools and VS Code debugging:
- Debug React components
- Set breakpoints in TSX files
- Inspect component state and props
- Network request inspection

**Note:** Make sure Chrome is installed at `/Applications/Google Chrome.app`

### 🤖 Debug Agent
Debug the agent service with MCP tools:
- Set breakpoints in tool implementations
- Debug workflow orchestration
- Inspect API responses

### 🧪 Debug Tests
Debug individual test files or all tests:
- **Debug Current Test File** - Debugs the test file you're currently editing
- **Debug All Tests** - Runs all tests with debugging

**Usage:**
```typescript
// Click in this test file and run "Debug Current Test File"
describe('MyComponent', () => {
  it('should work', () => {
    // Set breakpoint here
    expect(true).toBe(true);
  });
});
```

### 🔧 Debug Database Scripts
Debug database operations:
- Seed script debugging
- Schema push debugging
- Database reset debugging

### 🎯 Compound Configurations

#### Debug Full Stack
Runs both API and Web in debug mode simultaneously:
- Perfect for end-to-end debugging
- Trace requests from frontend to backend
- Set breakpoints in both React and API code

#### Debug Backend Services
Runs API and Agent together:
- Debug service-to-service communication
- Test agent tools with API

## Setting Breakpoints

### In TypeScript/JavaScript Files
1. Click in the gutter to the left of the line number
2. A red dot appears indicating a breakpoint
3. When code execution reaches that line, it will pause

### Conditional Breakpoints
1. Right-click in the gutter
2. Select "Add Conditional Breakpoint"
3. Enter a condition, e.g., `userId === '123'`
4. Code only pauses when condition is true

### Logpoints
1. Right-click in the gutter
2. Select "Add Logpoint"
3. Enter a message, e.g., `User ID: {userId}`
4. Logs to console without pausing execution

## Debug Controls

When paused at a breakpoint:

- **Continue (F5)** - Resume execution
- **Step Over (F10)** - Execute current line, don't enter functions
- **Step Into (F11)** - Enter into function calls
- **Step Out (Shift+F11)** - Exit current function
- **Restart (Cmd+Shift+F5)** - Restart the debug session
- **Stop (Shift+F5)** - Stop debugging

## Debug Panel Features

### Variables
- **Locals** - Variables in current scope
- **Globals** - Global variables
- **Closure** - Variables from parent scopes

### Watch
Add expressions to monitor:
1. Click "+" in Watch panel
2. Enter expression, e.g., `users.length`
3. See value update as you debug

### Call Stack
Shows the execution path that led to current breakpoint

### Debug Console
- Execute code in the current context
- Access variables when paused
- Run expressions to test theories

## Troubleshooting

### "Cannot connect to runtime"
```bash
# Make sure nothing else is using the debug port
lsof -i :9229
kill -9 [PID]
```

### Breakpoints Not Working
1. Make sure source maps are generated:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "sourceMap": true
     }
   }
   ```

2. Clear and rebuild:
   ```bash
   rm -rf dist .turbo
   yarn build
   ```

### Chrome Not Launching
Update the path in `.vscode/launch.json`:
```json
"runtimeExecutable": "/path/to/your/chrome"
```

Common paths:
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Windows: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`
- Linux: `/usr/bin/google-chrome`

## Advanced Debugging

### Remote Debugging
Connect to an already running Node process:

1. Start your app with inspect flag:
   ```bash
   node --inspect=9229 dist/index.js
   ```

2. Use "Attach to Running Process" configuration

3. VS Code connects to the running process

### Debug with Environment Variables
Edit `.vscode/launch.json` to add env vars:
```json
{
  "env": {
    "DEBUG": "app:*",
    "LOG_LEVEL": "debug"
  }
}
```

### Debug TypeScript with Source Maps
The configuration already handles this, but ensure:
- `"sourceMaps": true` in launch.json
- `"sourceMap": true` in tsconfig.json
- Source files are in the workspace

### Debug Production Builds
1. Build with source maps:
   ```bash
   yarn build
   ```

2. Modify launch config to use built files:
   ```json
   {
     "program": "${workspaceFolder}/apps/api/dist/index.js"
   }
   ```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Start Debugging | `F5` |
| Toggle Breakpoint | `F9` |
| Step Over | `F10` |
| Step Into | `F11` |
| Step Out | `Shift+F11` |
| Continue | `F5` |
| Stop | `Shift+F5` |
| Restart | `Cmd+Shift+F5` |
| Open Debug Panel | `Cmd+Shift+D` |
| Debug Console | `Cmd+Shift+Y` |

## Pro Tips

1. **Use Debug Console for Testing**
   When paused, test ideas in the Debug Console:
   ```javascript
   // When paused in a route handler
   await db.select().from(users).where(eq(users.id, 'test'))
   ```

2. **Conditional Breakpoints for Specific Cases**
   ```javascript
   // Only break when specific user
   request.body.email === 'test@example.com'
   ```

3. **Watch Expressions for Complex State**
   ```javascript
   // Add to watch panel
   JSON.stringify(request.body, null, 2)
   ```

4. **Use Logpoints Instead of console.log**
   - No code changes needed
   - Can be toggled on/off
   - Won't accidentally get committed

5. **Debug Async Code**
   VS Code handles async/await naturally:
   ```typescript
   const result = await fetchData(); // Set breakpoint here
   // Step through async operations normally
   ```

## Example Debug Session: Step-by-Step Walkthrough

### Scenario: Debug User Creation API

Let's debug the POST /api/users endpoint to understand how data flows through validation and database insertion.

#### Step 1: Set Up Your Environment

```bash
# Terminal 1: Start Docker services
yarn docker:up

# Wait for PostgreSQL to be ready, then:
yarn db:push
yarn db:seed
```

#### Step 2: Open the Code and Set Breakpoints

1. Open [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts)
2. Set breakpoints by clicking in the gutter next to these lines:
   - Line 53: `const data = insertUserSchema.parse(request.body);`
   - Line 57: `.values(data as typeof users.$inferInsert)`
   - Line 59: `return { user };`

#### Step 3: Start Debugging

1. Press `Cmd+Shift+D` to open Debug panel
2. Select **"Debug API"** from the dropdown
3. Press `F5` or click the green play button
4. Wait for the server to start (you'll see "🚀 API server running at http://0.0.0.0:3000" in the terminal)

#### Step 4: Trigger the Breakpoint

In a new terminal, send a POST request:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "debug@example.com", "name": "Debug User"}'
```

#### Step 5: Debug Session Walkthrough

**At First Breakpoint (Line 53):**
- VS Code pauses before parsing the request body
- In **Variables** panel, expand `Local` section:
  - `request.body` shows raw JSON: `{email: "debug@example.com", name: "Debug User"}`
  - `insertUserSchema` shows the Zod schema object
- In **Watch** panel, add expression: `JSON.stringify(request.body, null, 2)`
- Press `F10` (Step Over) to execute the parse

**At Second Breakpoint (Line 57):**
- Now `data` variable contains parsed and validated data
- Hover over `data` to see tooltip with values
- In **Debug Console**, type:
  ```javascript
  data.email  // Returns: "debug@example.com"
  typeof data // Returns: "object"
  ```
- Press `F11` (Step Into) to dive into the database insert

**Inside Database Insert:**
- Call stack shows: `userRoutes` → `insert` → `values`
- You can see SQL being constructed
- Press `Shift+F11` (Step Out) to return to route handler

**At Third Breakpoint (Line 59):**
- `user` variable contains the created user with generated ID
- In **Variables** panel, examine the user object:
  ```
  user: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "debug@example.com",
    name: "Debug User",
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
  }
  ```
- Press `F5` (Continue) to complete the request

#### Step 6: Check the Response

Your curl command receives the response:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "debug@example.com",
    "name": "Debug User",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Advanced Debugging Example: Conditional Breakpoint

Let's debug only when a specific email is used:

1. Right-click on line 53 in [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts)
2. Select "Add Conditional Breakpoint"
3. Enter condition: `request.body.email === 'test@debug.com'`
4. The breakpoint turns orange
5. Now it only triggers for that specific email

Test with multiple requests:
```bash
# This won't trigger the breakpoint
curl -X POST http://localhost:3000/api/users \
  -d '{"email": "other@example.com", "name": "Other User"}'

# This WILL trigger the breakpoint
curl -X POST http://localhost:3000/api/users \
  -d '{"email": "test@debug.com", "name": "Test Debug"}'
```

### Debugging Database Queries

Want to see the actual SQL being executed? Add a logpoint:

1. Open [packages/db/src/client.ts](packages/db/src/client.ts)
2. Find the database client initialization
3. Right-click and select "Add Logpoint"
4. Enter message: `SQL Query: {sql}`
5. Now all SQL queries are logged without stopping execution

### Debugging Tests with Breakpoints

1. Open [packages/shared/src/utils/validation.unit.test.ts](packages/shared/src/utils/validation.unit.test.ts)
2. Set a breakpoint inside any test
3. Press `F5` and select "Debug Current Test File"
4. The test runner stops at your breakpoint
5. Inspect test assertions and mock data

### Debugging React Components

1. Make sure Chrome is installed at the expected path
2. Press `F5` and select "Debug Web (Vite)"
3. Chrome opens with debugging enabled
4. In VS Code, open [apps/web/src/pages/UsersPage.tsx](apps/web/src/pages/UsersPage.tsx)
5. Set breakpoint in the component render
6. Navigate to the Users page in Chrome
7. VS Code pauses at your breakpoint
8. Inspect React props, state, and hooks

### Full Stack Debugging Session

Debug both frontend and backend simultaneously:

1. Set breakpoints in both:
   - [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts#L10) - GET /api/users
   - [apps/web/src/pages/UsersPage.tsx](apps/web/src/pages/UsersPage.tsx) - useQuery hook
2. Press `F5` and select "Debug Full Stack"
3. Both API and Web start in debug mode
4. Navigate to Users page
5. First, React breakpoint hits when component mounts
6. Continue (`F5`)
7. API breakpoint hits when fetching users
8. See the full request/response cycle

### Debug Session Tips

1. **Use the Debug Console for experiments:**
   ```javascript
   // While paused, test database queries
   await db.select().from(users).limit(5)

   // Inspect environment variables
   process.env.DATABASE_URL

   // Check request headers
   request.headers['content-type']
   ```

2. **Add useful Watch expressions:**
   - `request.body`
   - `request.params`
   - `request.headers.authorization`
   - `new Date().toISOString()`
   - `process.memoryUsage()`

3. **Use the Call Stack to understand flow:**
   - See the complete execution path
   - Click any frame to jump to that code
   - Understand middleware execution order

4. **Modify variables while debugging:**
   - In Variables panel, double-click a value
   - Change it to test different scenarios
   - Continue execution with modified data

5. **Use Exception Breakpoints:**
   - In Breakpoints panel, check "Uncaught Exceptions"
   - Debugger stops on any unhandled error
   - Perfect for finding the source of crashes

Happy debugging! 🐛🔍