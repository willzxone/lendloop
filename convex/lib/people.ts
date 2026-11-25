/**
 * Other members only see a short name ("Alice S."), never an email address.
 * Emails leave Convex only inside signed n8n payloads, to deliver a notification.
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A neighbour";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
