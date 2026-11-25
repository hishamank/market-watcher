import {
  type FeedMode,
  type MarketStatus,
  type RestErrorCode,
  type RestErrorResponse,
  RestErrorResponseSchema,
} from "@mini/contracts";
import type { FastifyError, FastifyInstance } from "fastify";
import type { Feed } from "../feeds/types.ts";

export class RestError extends Error {
  readonly statusCode: number;
  readonly code: RestErrorCode;

  constructor(statusCode: number, code: RestErrorCode, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function restErrorBody(
  feedMode: FeedMode,
  marketStatus: MarketStatus,
  code: RestErrorCode,
  message: string,
): RestErrorResponse {
  return RestErrorResponseSchema.parse({
    feedMode,
    marketStatus,
    error: { code, message },
  });
}

function classifyError(error: FastifyError | RestError): {
  statusCode: number;
  code: RestErrorCode;
  message: string;
} {
  if (error instanceof RestError) {
    return { statusCode: error.statusCode, code: error.code, message: error.message };
  }
  if (error.statusCode === 429) {
    return { statusCode: 429, code: "rate_limited", message: error.message || "Too many requests" };
  }
  if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
    return {
      statusCode: error.statusCode,
      code: "invalid_request",
      message: error.message || "Invalid request",
    };
  }
  return { statusCode: 500, code: "internal_error", message: "Internal gateway error" };
}

export function registerErrorHandlers(
  app: FastifyInstance,
  feed: Feed,
  feedMode: FeedMode,
  now: () => number,
): void {
  app.setNotFoundHandler((_request, reply) => {
    const body = restErrorBody(feedMode, feed.calendar.status(now()), "not_found", "Not found");
    return reply.code(404).send(body);
  });

  app.setErrorHandler((error, request, reply) => {
    const detail = classifyError(error as FastifyError | RestError);
    if (detail.statusCode >= 500) {
      request.log.error({ err: error }, "REST request failed");
    }
    const body = restErrorBody(feedMode, feed.calendar.status(now()), detail.code, detail.message);
    return reply.code(detail.statusCode).send(body);
  });
}
