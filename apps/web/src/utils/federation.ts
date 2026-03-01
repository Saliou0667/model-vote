export const DEFAULT_FEDERATION_ID = "france";
const SUPERADMIN_SCOPE_STORAGE_KEY = "model_vote_superadmin_federation_scope";

export function normalizeFederationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) return null;
  if (["fr", "france", "fr-fr", "federation-fr", "federation-france"].includes(normalized)) return "france";
  if (["be", "belgique", "belgium", "be-be", "federation-be", "federation-belgique", "federation-belgium"].includes(normalized)) {
    return "belgique";
  }
  return normalized;
}

export function resolveFederationId(value: unknown): string {
  return normalizeFederationId(value) ?? DEFAULT_FEDERATION_ID;
}

export function readStoredSuperAdminFederationScope(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeFederationId(window.localStorage.getItem(SUPERADMIN_SCOPE_STORAGE_KEY));
}

export function storeSuperAdminFederationScope(value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUPERADMIN_SCOPE_STORAGE_KEY, resolveFederationId(value));
}
