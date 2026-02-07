import { Box, CircularProgress } from "@mui/material";
import { Navigate } from "react-router-dom";
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
  const { loading, user, role } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (role === "admin" || role === "superadmin") return <Navigate to="/admin" replace />;
  return <Navigate to="/member" replace />;
}

export function RequireAuth({ children }: GuardProps) {
  const { loading, user } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: GuardProps) {
  const { loading, user, role } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (role !== "admin" && role !== "superadmin") return <Navigate to="/member" replace />;
  return <>{children}</>;
}

export function RequireSuperAdmin({ children }: GuardProps) {
  const { loading, user, role } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (role !== "superadmin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
