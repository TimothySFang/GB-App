export function defaultClimbName(displayName: string, id: string): string {
  const initials = displayName.trim().split(/\s+/u)
    .map((part) => Array.from(part).find((character) => /[\p{L}\p{N}]/u.test(character)) ?? '')
    .join('').toUpperCase() || 'GB';
  return `${initials}-${id}`;
}
