import { defineConfig } from "tsup"

// Bundles the server (and the lab data it reuses) into a single ESM file.
// Runtime deps (fastify, @fastify/cors) stay external and resolve from
// node_modules at start time.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
})
