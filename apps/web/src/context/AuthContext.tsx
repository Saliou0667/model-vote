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
import type { AuthContextValue, MemberProfile, SignUpPayload, UserRole } from "../types/auth";

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [role, setRole] = useState<UserRole>("member");
  const [loading, setLoading] = useState(true);

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

      try {
        const memberRef = doc(db, "members", nextUser.uid);
        const memberSnap = await getDoc(memberRef);
        const nextProfile = memberSnap.exists()
          ? ({ uid: memberSnap.id, ...(memberSnap.data() as Omit<MemberProfile, "uid">) } as MemberProfile)
          : null;

        setProfile(nextProfile);
        setRole(nextProfile?.role ?? claimRole ?? "member");
      } catch {
        // Keep app usable while backend/emulators are warming up.
        setProfile(null);
        setRole(claimRole ?? "member");
      }
    },
    [ensureProfile],
  );

  const refreshAuthState = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setProfile(null);
      setRole("member");
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
        setLoading(false);
        return;
      }

      try {
        await loadMemberProfile(nextUser);
      } catch {
        setProfile(null);
        setRole("member");
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
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUp: async (payload: SignUpPayload) => {
        const cred = await createUserWithEmailAndPassword(auth, payload.email.trim().toLowerCase(), payload.password);
        const ensureMemberProfile = httpsCallable(functions, "ensureMemberProfile");
        await ensureMemberProfile({});
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
    }),
    [loading, profile, refreshAuthState, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
