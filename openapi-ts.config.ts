import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: [
    "http://localhost:8014/documentation/json",
  ],
  output: [
    "src/integrations/generated-clients/accounting-client",
  ],
  plugins: [
    {
      name: "@tanstack/react-query",
      queryOptions: true,
    },
  ],
});