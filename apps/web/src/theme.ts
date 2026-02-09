import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#103B73",
      dark: "#0B2B54",
      light: "#3D6DAA",
      contrastText: "#F7FBFF",
    },
    secondary: {
      main: "#2F8F6A",
      dark: "#21664C",
      light: "#66B594",
    },
    background: {
      default: "#F1F5F8",
      paper: "#FDFDFB",
    },
    success: { main: "#2B7A59" },
    error: { main: "#B23A2C" },
    warning: { main: "#B7791F" },
    info: { main: "#2C6A95" },
    text: {
      primary: "#13263B",
      secondary: "#4A5B70",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: "'Manrope', 'Segoe UI', sans-serif",
    h1: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    h2: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    h3: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    h4: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    h5: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    h6: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    button: {
      textTransform: "none",
      fontWeight: 700,
      letterSpacing: 0.2,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(1200px circle at 10% -20%, rgba(16,59,115,0.16), transparent 45%), radial-gradient(900px circle at 100% 0%, rgba(47,143,106,0.14), transparent 40%), #F1F5F8",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(16,59,115,0.10)",
          boxShadow: "0 12px 30px rgba(9, 31, 56, 0.10)",
          backdropFilter: "blur(4px)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 16,
          minHeight: 42,
        },
        containedPrimary: {
          boxShadow: "0 10px 20px rgba(16,59,115,0.25)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          overflow: "hidden",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginInline: 8,
          marginBlock: 2,
          "&.Mui-selected": {
            backgroundColor: "rgba(16,59,115,0.14)",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});
