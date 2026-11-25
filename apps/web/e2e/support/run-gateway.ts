import { writeFileSync } from "node:fs";
import { gatewayPidFile, startGateway } from "./gateway-process.ts";

writeFileSync(gatewayPidFile, String(process.pid));
startGateway(false).on("exit", (code) => process.exit(code ?? 0));
