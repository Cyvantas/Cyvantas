import { buildApp } from "./app.ts"
import { loadConfig } from "./config/env.ts"

async function main(): Promise<void> {
  const config = loadConfig()
  const app = await buildApp({ config })

  try {
    await app.listen({ port: config.port, host: config.host })
    console.log(
      `cyvantas-api listening on http://${config.host}:${config.port}`,
    )
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()
