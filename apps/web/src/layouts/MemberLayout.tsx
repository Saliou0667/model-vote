import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
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
  { label: "Accueil", to: "/member" },
  { label: "Mon profil", to: "/member/profile" },
  { label: "Mon eligibilite", to: "/member/eligibility" },
  { label: "Vote", to: "/member/vote" },
  { label: "Resultats", to: "/member/results" },
];

export function MemberLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { signOutUser, user } = useAuth();

  const selectedPath = useMemo(() => {
    const match = navItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
    return match?.to ?? "/member";
  }, [location.pathname]);

  const drawerContent = (
    <>
      <Toolbar>
        <Stack>
          <Typography variant="h6">MODEL Vote</Typography>
          <Typography variant="caption" color="text.secondary">
            Espace membre
          </Typography>
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
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box px={2} py={1.5}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={async () => {
            await signOutUser();
            navigate("/auth/login", { replace: true });
          }}
        >
          Se deconnecter
        </Button>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
      {!isDesktop ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: drawerWidth } }}
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
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : null}

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          {!isDesktop ? (
            <IconButton onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6">Espace membre</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Toolbar>
        <Box p={{ xs: 2, md: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
