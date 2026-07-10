import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";

const PORT = Number(process.env.PORT ?? 3103);

const app = new Elysia()
  // Add Swagger for auto-generated OpenAPI documentation at /swagger
  .use(swagger())
  .get("/", () => ({ status: "ok", message: "Hello from Elysia 🦊" }))
  .get("/health", () => ({ status: "healthy" }))
  // Example endpoint demonstrating type safety and validation
  .post(
    "/echo",
    ({ body }) => {
      return { received: body };
    },
    {
      body: t.Object({
        message: t.String(),
        count: t.Optional(t.Number()),
      }),
      detail: {
        summary: "Echo endpoint",
        description: "Echoes the request body with type validation",
      },
    }
  )
  .listen(PORT);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 API Documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`
);

export type App = typeof app;
