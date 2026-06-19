import { createTool } from "@voltagent/core";
import { z } from "zod";

export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("City or location to get weather for"),
  }),
  execute: async ({ location }) => {
    await Promise.resolve();
    return {
      weather: {
        location,
        temperature: 21,
        condition: "Sunny",
        humidity: 45,
        windSpeed: 8,
      },
      message: `Current weather in ${location}: 21 C and sunny.`,
    };
  },
});
