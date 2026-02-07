import type { Timestamp } from "firebase/firestore";

export type Section = {
  id: string;
  name: string;
  city: string;
  region?: string;
  memberCount?: number;
};

export type Member = {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  sectionId?: string;
  role: "member" | "admin" | "superadmin";
  status: "pending" | "active" | "suspended";
  emailVerified?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
