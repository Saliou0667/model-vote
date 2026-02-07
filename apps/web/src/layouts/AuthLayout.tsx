import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 45%, #90CAF9 100%)",
        display: "grid",
        placeItems: "center",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant="h4">MODEL Vote</Typography>
              <Typography color="text.secondary">Mouvement Democratique Liberal</Typography>
            </Stack>
            <Outlet />
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
