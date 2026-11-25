import { cache } from "react";
import { createQueryClient } from "./query-client.ts";

export const getServerQueryClient = cache(createQueryClient);
