import { DEFAULT_FEDERATION_ID, resolveFederationId } from "../utils/federation";

let currentFederationScopeId = DEFAULT_FEDERATION_ID;

export function getFederationScopeId(): string {
  return currentFederationScopeId;
}

export function setFederationScopeId(value: unknown): string {
  currentFederationScopeId = resolveFederationId(value);
  return currentFederationScopeId;
}
