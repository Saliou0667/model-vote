import type { User } from "firebase/auth";

export type UserRole = "member" | "admin" | "superadmin";
export type MemberStatus = "pending" | "active" | "suspended";

export interface MemberProfile {
  uid: string;
  email: string;
  role: UserRole;
  status: MemberStatus;
  registrationSource?: "self_registration" | "admin_created";
  votingApprovedByAdmin?: boolean;
  firstName?: string;
  lastName?: string;
  city?: string;
  phone?: string;
  sectionId?: string;
  passwordChangeRequired?: boolean;
}

export type SignUpPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
  sectionId?: string;
};

export interface AuthContextValue {
  user: User | null;
  role: UserRole;
  profile: MemberProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOutUser: () => Promise<void>;
  sendVerification: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
}
