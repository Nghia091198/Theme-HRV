import { HaravanContentService } from "../mcp/service.mjs";

const service = new HaravanContentService({ logger: () => {} });

try {
  const result = await service.checkConnection();
  console.log(JSON.stringify(result));
} catch (error) {
  console.log(JSON.stringify({
    connected: false,
    error: { name: error?.name ?? "Error", status: error?.status ?? null, message: String(error?.message ?? error) },
  }));
  process.exitCode = 1;
}
