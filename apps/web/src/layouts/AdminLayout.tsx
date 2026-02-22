import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BallotRoundedIcon from "@mui/icons-material/BallotRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const drawerWidth = 280;

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOutUser, user } = useAuth();

  const navItems = useMemo(() => {
    const items = [
      { label: "Dashboard", mobileLabel: "Accueil", to: "/admin", icon: <DashboardRoundedIcon fontSize="small" /> },
      { label: "Membres", mobileLabel: "Membres", to: "/admin/members", icon: <Groups2RoundedIcon fontSize="small" /> },
      { label: "Sections", mobileLabel: "Sections", to: "/admin/sections", icon: <HubRoundedIcon fontSize="small" /> },
      { label: "Conditions", mobileLabel: "Conditions", to: "/admin/conditions", icon: <HowToRegRoundedIcon fontSize="small" /> },
      { label: "Cotisations", mobileLabel: "Cotis.", to: "/admin/contributions", icon: <TuneRoundedIcon fontSize="small" /> },
      { label: "Elections", mobileLabel: "Elections", to: "/admin/elections", icon: <BallotRoundedIcon fontSize="small" /> },
      { label: "Scores", mobileLabel: "Scores", to: "/admin/scores", icon: <LeaderboardRoundedIcon fontSize="small" /> },
      { label: "Candidats", mobileLabel: "Candidats", to: "/admin/candidates", icon: <CampaignRoundedIcon fontSize="small" /> },
      { label: "Logs", mobileLabel: "Logs", to: "/admin/logs", icon: <HistoryEduRoundedIcon fontSize="small" /> },
    ];

    if (role === "admin" || role === "superadmin") {
      items.push({
        label: "Admins",
        mobileLabel: "Admins",
        to: "/admin/admins",
        icon: <AdminPanelSettingsRoundedIcon fontSize="small" />,
      });
    }

    if (role === "superadmin") {
      items.push({ label: "Audit", mobileLabel: "Audit", to: "/admin/audit", icon: <HistoryEduRoundedIcon fontSize="small" /> });
    }

    return items;
  }, [role]);

  const selectedPath = useMemo(() => {
    const match = navItems.find((item) => {
      if (item.to === "/admin") {
        return location.pathname === "/admin";
      }
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    });
    return match?.to ?? "/admin";
  }, [location.pathname, navItems]);
  const mobileNavItems = useMemo(
    () =>
      navItems.filter((item) =>
        ["/admin", "/admin/members", "/admin/scores", "/admin/candidates", "/admin/conditions"].includes(item.to),
      ),
    [navItems],
  );
  const mobileSelectedPath = useMemo(
    () => (mobileNavItems.some((item) => item.to === selectedPath) ? selectedPath : null),
    [mobileNavItems, selectedPath],
  );

  const drawerContent = (
    <>
      <Toolbar>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box
            component="img"
            src="/model-logo.jpg"
            alt="Logo MODEL"
            sx={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(16,59,115,0.2)" }}
          />
          <Stack spacing={0.4}>
            <Typography variant="h6">MODEL Vote</Typography>
            <Typography variant="caption" color="text.secondary">
              Console d'administration
            </Typography>
          </Stack>
        </Stack>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            selected={selectedPath === item.to}
            onClick={() => {
              navigate(item.to);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", p: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 2.5, bgcolor: "rgba(16,59,115,0.05)" }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14 }}>
              {(user?.email ?? "A").charAt(0).toUpperCase()}
            </Avatar>
            <Stack minWidth={0}>
              <Typography variant="caption" color="text.secondary">
                Connecte
              </Typography>
              <Typography variant="body2" noWrap>
                {user?.email}
              </Typography>
            </Stack>
          </Stack>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LogoutIcon />}
            sx={{ mt: 1.1 }}
            onClick={async () => {
              await signOutUser();
              navigate("/auth/login", { replace: true });
            }}
          >
            Se deconnecter
          </Button>
        </Paper>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }} className="model-fade-up">
      {!isDesktop ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: drawerWidth, backgroundColor: "background.paper" } }}
        >
          {drawerContent}
        </Drawer>
      ) : null}

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid rgba(16,59,115,0.14)",
              background: "linear-gradient(180deg, rgba(253,253,251,0.95), rgba(247,251,255,0.90))",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : null}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pb: { xs: "88px", md: 0 } }}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(16,59,115,0.12)",
            backgroundColor: "rgba(241,245,248,0.85)",
          }}
        >
          {!isDesktop ? (
            <IconButton onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontSize: { xs: "1.02rem", sm: "1.2rem" } }}>
              Espace admin
            </Typography>
            <Chip
              size="small"
              label={role === "superadmin" ? "SuperAdmin" : "Admin"}
              color={role === "superadmin" ? "secondary" : "primary"}
              variant="outlined"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 260, display: { xs: "none", md: "block" } }}>
            {user?.email}
          </Typography>
        </Toolbar>
        <Box p={{ xs: 2, md: 3 }} className="model-stagger">
          <Outlet />
        </Box>
        {!isDesktop ? (
          <Paper
            elevation={8}
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: "16px 16px 0 0",
              zIndex: 20,
            }}
          >
            <BottomNavigation
              showLabels
              sx={{
                height: "calc(66px + env(safe-area-inset-bottom))",
                pb: "env(safe-area-inset-bottom)",
                "& .MuiBottomNavigationAction-root": {
                  minWidth: 64,
                  maxWidth: "none",
                  flex: 1,
                  px: 0.25,
                },
                "& .MuiBottomNavigationAction-label": {
                  fontSize: "0.68rem",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                },
              }}
              value={mobileSelectedPath}
              onChange={(_, next) => {
                if (next === "__menu__") {
                  setMobileOpen(true);
                  return;
                }
                if (typeof next === "string") navigate(next);
              }}
            >
              {mobileNavItems.map((item) => (
                <BottomNavigationAction key={item.to} label={item.mobileLabel ?? item.label} value={item.to} icon={item.icon} />
              ))}
              <BottomNavigationAction label="Menu" value="__menu__" icon={<MenuIcon fontSize="small" />} />
            </BottomNavigation>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
