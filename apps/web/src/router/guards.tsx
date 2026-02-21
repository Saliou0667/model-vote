import { Box, CircularProgress } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

type GuardProps = {
  children: ReactNode;
};

function Loader() {
  return (
    <Box minHeight="70vh" display="grid" sx={{ placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}

export function AppEntryRedirect() {
  const { loading, user, role, profile } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if ((role === "admin" || role === "superadmin") && profile?.status !== "active") {
    return <Navigate to="/pending-approval" replace />;
  }
  if (role === "admin" || role === "superadmin") return <Navigate to="/admin" replace />;
  if (profile?.status !== "active") return <Navigate to="/pending-approval" replace />;
  if (profile?.passwordChangeRequired === true) return <Navigate to="/member/profile" replace />;
  return <Navigate to="/member/vote" replace />;
}

export function RequireAuth({ children }: GuardProps) {
  const location = useLocation();
  const { loading, user, role, profile } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (role === "member" && profile?.status !== "active") return <Navigate to="/pending-approval" replace />;
  if (
    role === "member" &&
    profile?.passwordChangeRequired === true &&
    !location.pathname.startsWith("/member/profile")
  ) {
    return <Navigate to="/member/profile" replace />;
  }
  return <>{children}</>;
}

export function RequireSignedIn({ children }: GuardProps) {
  const { loading, user } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: GuardProps) {
  const { loading, user, role, profile } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (role !== "admin" && role !== "superadmin") return <Navigate to="/member" replace />;
  if (profile?.status !== "active") return <Navigate to="/pending-approval" replace />;
  return <>{children}</>;
}

export function RequireSuperAdmin({ children }: GuardProps) {
  const { loading, user, role, profile } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (role !== "superadmin") return <Navigate to="/admin" replace />;
  if (profile?.status !== "active") return <Navigate to="/pending-approval" replace />;
  return <>{children}</>;
}
