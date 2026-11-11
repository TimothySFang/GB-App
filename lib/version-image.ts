// A replacement photo has a new storage key, so it must also have a new URL.
export function versionImageUrl(versionId: string, imageKey: string): string {
  return `/api/versions/${versionId}/image?v=${encodeURIComponent(imageKey)}`;
}
