/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../config/firebase";
import type { ReactNode } from "react";
import { setFederationScopeId as setGlobalFederationScopeId } from "../state/federationScope";
import type { AuthContextValue, MemberProfile, SignUpPayload, UserRole } from "../types/auth";
import {
  DEFAULT_FEDERATION_ID,
  readStoredSuperAdminFederationScope,
  resolveFederationId,
  storeSuperAdminFederationScope,
} from "../utils/federation";

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [role, setRole] = useState<UserRole>("member");
  const [federationId, setFederationId] = useState<string>(DEFAULT_FEDERATION_ID);
  const [federationScopeId, setFederationScopeIdState] = useState<string>(DEFAULT_FEDERATION_ID);
  const [loading, setLoading] = useState(true);

  const applyFederationScope = useCallback((nextRole: UserRole, nextFederationId: string) => {
    if (nextRole === "superadmin") {
      const storedScope = readStoredSuperAdminFederationScope();
      const resolvedScope = resolveFederationId(storedScope ?? nextFederationId);
      setFederationScopeIdState(resolvedScope);
      setGlobalFederationScopeId(resolvedScope);
      return;
    }

    setFederationScopeIdState(nextFederationId);
    setGlobalFederationScopeId(nextFederationId);
  }, []);

  const ensureProfile = useCallback(async () => {
    const callable = httpsCallable(functions, "ensureMemberProfile");
    try {
      await callable({});
    } catch {
      // Non-blocking: guards will still rely on claims + available profile.
    }
  }, []);

  const loadMemberProfile = useCallback(
    async (nextUser: User) => {
      await ensureProfile();
      const token = await getIdTokenResult(nextUser, true).catch(() => null);
      const claimRole = token?.claims.role as UserRole | undefined;
      const claimFederationId = resolveFederationId(token?.claims.federationId);

      try {
        const memberRef = doc(db, "members", nextUser.uid);
        const memberSnap = await getDoc(memberRef);
        const nextProfile = memberSnap.exists()
          ? ({ uid: memberSnap.id, ...(memberSnap.data() as Omit<MemberProfile, "uid">) } as MemberProfile)
          : null;
        const memberFederationId = resolveFederationId(nextProfile?.federationId ?? claimFederationId);
        const hydratedProfile = nextProfile ? { ...nextProfile, federationId: memberFederationId } : null;
        const nextRole = hydratedProfile?.role ?? claimRole ?? "member";

        setProfile(hydratedProfile);
        setRole(nextRole);
        setFederationId(memberFederationId);
        applyFederationScope(nextRole, memberFederationId);
      } catch {
        // Keep app usable while backend/emulators are warming up.
        setProfile(null);
        const nextRole = claimRole ?? "member";
        setRole(nextRole);
        setFederationId(claimFederationId);
        applyFederationScope(nextRole, claimFederationId);
      }
    },
    [applyFederationScope, ensureProfile],
  );

  const refreshAuthState = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setProfile(null);
      setRole("member");
      setFederationId(DEFAULT_FEDERATION_ID);
      setFederationScopeIdState(DEFAULT_FEDERATION_ID);
      setGlobalFederationScopeId(DEFAULT_FEDERATION_ID);
      return;
    }
    await current.reload();
    await loadMemberProfile(current);
  }, [loadMemberProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setRole("member");
        setFederationId(DEFAULT_FEDERATION_ID);
        setFederationScopeIdState(DEFAULT_FEDERATION_ID);
        setGlobalFederationScopeId(DEFAULT_FEDERATION_ID);
        setLoading(false);
        return;
      }

      try {
        await loadMemberProfile(nextUser);
      } catch {
        setProfile(null);
        setRole("member");
        setFederationId(DEFAULT_FEDERATION_ID);
        setFederationScopeIdState(DEFAULT_FEDERATION_ID);
        setGlobalFederationScopeId(DEFAULT_FEDERATION_ID);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadMemberProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      profile,
      federationId,
      federationScopeId,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUp: async (payload: SignUpPayload) => {
        const cred = await createUserWithEmailAndPassword(auth, payload.email.trim().toLowerCase(), payload.password);
        const ensureMemberProfile = httpsCallable(functions, "ensureMemberProfile");
        await ensureMemberProfile({ federationId: payload.federationId });
        const updateMember = httpsCallable(functions, "updateMember");
        await updateMember({
          memberId: cred.user.uid,
          updates: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            city: payload.city,
            phone: payload.phone,
            sectionId: payload.sectionId ?? "",
          },
        });
      },
      signOutUser: async () => {
        await signOut(auth);
      },
      sendVerification: async () => {
        // Verification email disabled in this workflow (admin approval is authoritative).
      },
      refreshAuthState,
      setFederationScope: (nextFederationId: string) => {
        const resolvedScope = resolveFederationId(nextFederationId);
        if (role !== "superadmin") {
          setFederationScopeIdState(federationId);
          setGlobalFederationScopeId(federationId);
          return;
        }
        storeSuperAdminFederationScope(resolvedScope);
        setFederationScopeIdState(resolvedScope);
        setGlobalFederationScopeId(resolvedScope);
      },
    }),
    [federationId, federationScopeId, loading, profile, refreshAuthState, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
