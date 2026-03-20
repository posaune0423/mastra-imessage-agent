import type { IMessageSDK } from "@photon-ai/imessage-kit";
import { homedir } from "node:os";
import { join } from "node:path";

const AUTHORIZATION_HINTS = [
  "authorization denied",
  "auth denied",
  "authn denied",
  "operation not permitted",
  "permission denied",
  "eacces",
  "eperm",
] as const;

type IMessageDatabaseProbe = Pick<IMessageSDK, "getMessages">;

export function getIMessageDatabasePath(): string {
  return join(homedir(), "Library", "Messages", "chat.db");
}

export function isIMessageAuthorizationError(error: unknown): boolean {
  const message = flattenErrorMessages(error).join("\n").toLowerCase();
  return AUTHORIZATION_HINTS.some((hint) => message.includes(hint));
}

export function formatIMessageDatabaseAccessError(databasePath: string, error: unknown): string {
  const originalMessage = extractErrorMessage(error);

  if (isIMessageAuthorizationError(error)) {
    return [
      `macOS denied access to the iMessage database at ${databasePath}.`,
      "Grant Full Disk Access to the app that launches this command, such as Cursor, Terminal, iTerm, or Warp, then restart the agent.",
      `Original error: ${originalMessage}`,
    ].join(" ");
  }

  return `Failed to read the iMessage database at ${databasePath}. Original error: ${originalMessage}`;
}

export async function assertIMessageDatabaseReady(
  sdk: IMessageDatabaseProbe,
  databasePath = getIMessageDatabasePath(),
): Promise<void> {
  try {
    await sdk.getMessages({
      limit: 1,
      excludeOwnMessages: false,
    });
  } catch (error) {
    throw new Error(formatIMessageDatabaseAccessError(databasePath, error), {
      cause: error,
    });
  }
}

function flattenErrorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [String(error)];
  }

  const messages = [error.message];

  if ("cause" in error && error.cause) {
    messages.push(...flattenErrorMessages(error.cause));
  }

  return messages;
}

function extractErrorMessage(error: unknown): string {
  return flattenErrorMessages(error).find((message) => message.trim().length > 0) ?? "unknown error";
}
