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
  contributionUpToDate?: boolean;
};

export type ContributionPolicy = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  periodicity: "monthly" | "quarterly" | "yearly";
  gracePeriodDays: number;
  isActive: boolean;
};

export type PaymentRecord = {
  id: string;
  memberId: string;
  policyId: string;
  amount: number;
  currency: string;
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
  reference?: string;
  note?: string;
  recordedBy?: string;
  recordedAt?: Timestamp;
};
