/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { ReactNode } from "react";
import type { AuthContextValue, MemberProfile, UserRole } from "../types/auth";

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [role, setRole] = useState<UserRole>("member");
  const [loading, setLoading] = useState(true);

  const loadMemberProfile = useCallback(async (nextUser: User) => {
    const token = await nextUser.getIdTokenResult(true);
    const claimRole = token.claims.role as UserRole | undefined;

    const memberRef = doc(db, "members", nextUser.uid);
    const memberSnap = await getDoc(memberRef);
    const nextProfile = memberSnap.exists()
      ? ({ uid: memberSnap.id, ...(memberSnap.data() as Omit<MemberProfile, "uid">) } as MemberProfile)
      : null;

    setProfile(nextProfile);
    setRole(nextProfile?.role ?? claimRole ?? "member");
  }, []);

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
      signUp: async (email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
      },
      signOutUser: async () => {
        await signOut(auth);
      },
      sendVerification: async () => {
        if (!auth.currentUser) return;
        await sendEmailVerification(auth.currentUser);
      },
      refreshAuthState,
    }),
    [loading, profile, refreshAuthState, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
