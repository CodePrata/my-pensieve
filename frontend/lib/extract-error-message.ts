export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "message" in body &&
      (body as { message: unknown }).message
    ) {
      const { message } = body as { message: unknown };
      return Array.isArray(message) ? message.join(", ") : String(message);
    }
  } catch {
    // response body wasn't JSON — fall through to status-based message
  }
  return `Request failed with status ${response.status}`;
}
