import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { MemberLayout } from "../layouts/MemberLayout";
import { LoginPage, RegisterPage, VerifyEmailPage } from "../pages/AuthPages";
import { NotFoundPage } from "../pages/NotFoundPage";
import {
  AdminContributionsPage,
  AdminConditionsPage,
  AdminDashboardPage,
  AdminElectionsPage,
  AdminLogsPage,
  AdminMembersPage,
  AdminSectionsPage,
  MemberDashboardPage,
  MemberEligibilityPage,
  MemberProfilePage,
  MemberResultsPage,
  MemberVotePage,
  SuperAdminAdminsPage,
  SuperAdminAuditPage,
} from "../pages/Placeholders";
import { AppEntryRedirect, RequireAdmin, RequireAuth, RequireSuperAdmin } from "./guards";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AppEntryRedirect />} />

      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>

      <Route
        path="/verify-email"
        element={
          <RequireAuth>
            <AuthLayout />
          </RequireAuth>
        }
      >
        <Route index element={<VerifyEmailPage />} />
      </Route>

      <Route
        path="/member"
        element={
          <RequireAuth>
            <MemberLayout />
          </RequireAuth>
        }
      >
        <Route index element={<MemberDashboardPage />} />
        <Route path="profile" element={<MemberProfilePage />} />
        <Route path="eligibility" element={<MemberEligibilityPage />} />
        <Route path="vote" element={<MemberVotePage />} />
        <Route path="results" element={<MemberResultsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="members" element={<AdminMembersPage />} />
        <Route path="sections" element={<AdminSectionsPage />} />
        <Route path="conditions" element={<AdminConditionsPage />} />
        <Route path="contributions" element={<AdminContributionsPage />} />
        <Route path="elections" element={<AdminElectionsPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
        <Route
          path="admins"
          element={
            <RequireSuperAdmin>
              <SuperAdminAdminsPage />
            </RequireSuperAdmin>
          }
        />
        <Route
          path="audit"
          element={
            <RequireSuperAdmin>
              <SuperAdminAuditPage />
            </RequireSuperAdmin>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
