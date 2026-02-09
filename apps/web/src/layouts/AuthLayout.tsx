import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { Box, Chip, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(140deg, rgba(16,59,115,0.98) 0%, rgba(22,72,133,0.95) 40%, rgba(37,117,166,0.92) 100%)",
        p: { xs: 2, md: 3 },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.24), transparent 70%)",
          top: -140,
          right: -120,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(47,143,106,0.34), transparent 72%)",
          bottom: -170,
          left: -180,
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Paper className="model-fade-up glass-panel" elevation={8} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 6 }}>
          <Grid container spacing={3} alignItems="stretch">
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  height: "100%",
                  borderRadius: 4,
                  p: { xs: 2.5, md: 3 },
                  color: "#F7FBFF",
                  background:
                    "linear-gradient(155deg, rgba(11,43,84,0.95), rgba(16,59,115,0.88) 60%, rgba(33,102,76,0.88))",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Stack spacing={2.2}>
                  <Box
                    component="img"
                    src="/model-logo.jpg"
                    alt="Logo MODEL"
                    sx={{
                      width: 92,
                      height: 92,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid rgba(247,251,255,0.45)",
                      boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
                    }}
                  />
                  <Chip
                    icon={<GavelRoundedIcon sx={{ color: "#F7FBFF !important" }} />}
                    label="Plateforme electorale interne"
                    sx={{ alignSelf: "flex-start", color: "#F7FBFF", borderColor: "rgba(247,251,255,0.35)" }}
                    variant="outlined"
                  />
                  <Stack spacing={0.7}>
                    <Typography variant="h3" sx={{ color: "#F7FBFF", lineHeight: 1.08 }}>
                      MODEL Vote
                    </Typography>
                    <Typography sx={{ color: "rgba(247,251,255,0.82)" }}>
                      Mouvement Democratique Liberal
                    </Typography>
                  </Stack>
                </Stack>
                <Stack spacing={1.6} className="model-stagger">
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <ShieldRoundedIcon fontSize="small" />
                    <Typography variant="body2">Acces controle par roles et validation admin</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <HowToVoteRoundedIcon fontSize="small" />
                    <Typography variant="body2">Vote simple, suivi transparent, audit reserve</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={3} sx={{ p: { xs: 0.5, md: 1.5 } }}>
                <Stack spacing={0.5}>
                  <Typography variant="h5">Acces a la plateforme</Typography>
                  <Typography color="text.secondary">
                    Inscription controlee, validation par les administrateurs puis acces a l'espace membre.
                  </Typography>
                </Stack>
                <Box className="model-stagger">
                  <Outlet />
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}
