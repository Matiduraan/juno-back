import { Request } from "express";

export function parseQueryToRecord(
  query: Request["query"]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}
