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
  city?: string;
  phone?: string;
  sectionId?: string;
  role: "member" | "admin" | "superadmin";
  status: "pending" | "active" | "suspended";
  registrationSource?: "self_registration" | "admin_created";
  votingApprovedByAdmin?: boolean;
  emailVerified?: boolean;
  passwordChangeRequired?: boolean;
  passwordUpdatedAt?: Timestamp | null;
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

export type Condition = {
  id: string;
  name: string;
  description: string;
  type: "checkbox" | "date" | "amount" | "file" | "text";
  validityDuration?: number | null;
  isActive: boolean;
};

export type MemberCondition = {
  id: string;
  memberId: string;
  conditionId: string;
  validated: boolean;
  validatedBy?: string;
  validatedAt?: Timestamp;
  expiresAt?: Timestamp | null;
  note?: string;
  evidence?: string;
};

export type Election = {
  id: string;
  title: string;
  description: string;
  type: "federal" | "section" | "other";
  status: "draft" | "open" | "closed" | "published" | "archived";
  startAt?: Timestamp;
  endAt?: Timestamp;
  voterConditionIds?: string[];
  candidateConditionIds?: string[];
  allowedSectionIds?: string[] | null;
  minSeniority?: number;
  totalEligibleVoters?: number;
  totalVotesCast?: number;
};

export type Candidate = {
  id: string;
  memberId: string;
  displayName: string;
  sectionName: string;
  bio?: string;
  projectSummary?: string;
  videoUrl?: string;
  photoUrl?: string;
  status: "proposed" | "validated" | "rejected";
  displayOrder?: number;
};
