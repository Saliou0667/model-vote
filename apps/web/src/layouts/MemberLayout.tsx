import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import PollRoundedIcon from "@mui/icons-material/PollRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
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

const drawerWidth = 250;

const navItems = [
  { label: "Accueil", mobileLabel: "Accueil", to: "/member", icon: <HomeRoundedIcon fontSize="small" /> },
  { label: "Profil", mobileLabel: "Profil", to: "/member/profile", icon: <AccountCircleRoundedIcon fontSize="small" /> },
  {
    label: "Espace candidat",
    mobileLabel: "Candidat",
    to: "/member/candidate-space",
    icon: <CampaignRoundedIcon fontSize="small" />,
  },
  { label: "Eligibilite", mobileLabel: "Eligibilite", to: "/member/eligibility", icon: <TaskAltRoundedIcon fontSize="small" /> },
  { label: "Vote", mobileLabel: "Vote", to: "/member/vote", icon: <HowToVoteRoundedIcon fontSize="small" /> },
  { label: "Resultats", mobileLabel: "Resultats", to: "/member/results", icon: <PollRoundedIcon fontSize="small" /> },
];

const mobilePrimaryNavItems = ["/member", "/member/eligibility", "/member/vote", "/member/profile"];

export function MemberLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { signOutUser, user } = useAuth();

  const selectedPath = useMemo(() => {
    const match = navItems.find((item) => {
      if (item.to === "/member") {
        return location.pathname === "/member";
      }
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    });
    return match?.to ?? "/member";
  }, [location.pathname]);
  const mobileNavItems = useMemo(() => navItems.filter((item) => mobilePrimaryNavItems.includes(item.to)), []);
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
          <Stack>
            <Typography variant="h6">MODEL Vote</Typography>
            <Typography variant="caption" color="text.secondary">
              Espace membre
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
            <Avatar sx={{ width: 34, height: 34, bgcolor: "secondary.main", fontSize: 14 }}>
              {(user?.email ?? "M").charAt(0).toUpperCase()}
            </Avatar>
            <Stack minWidth={0}>
              <Typography variant="caption" color="text.secondary">
                Compte membre
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
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, lineHeight: 1.2, fontSize: { xs: "1.05rem", sm: "1.2rem" } }}>
            {isDesktop ? "Espace membre" : "Membre"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ maxWidth: 220, display: { xs: "none", sm: "block" } }}
          >
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
                <BottomNavigationAction key={item.to} label={item.mobileLabel} value={item.to} icon={item.icon} />
              ))}
              <BottomNavigationAction label="Menu" value="__menu__" icon={<MenuIcon fontSize="small" />} />
            </BottomNavigation>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
