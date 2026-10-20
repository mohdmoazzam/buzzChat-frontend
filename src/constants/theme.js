import { createTheme } from "@mui/material";
import { orange } from "./color";

export const accentDark = "#d85c5c";
export const accentSoft = "rgba(234, 112, 112, 0.12)";
export const brandGradient = `linear-gradient(145deg, ${orange} 0%, #c94f7c 100%)`;
export const borderColor = "#ececf0";
export const surfaceMuted = "#f6f6f8";

// Max width of the app column on large screens (chat app and login share it)
export const APP_MAX_WIDTH = 1440;

const theme = createTheme({
    palette: {
        primary: { main: orange, dark: accentDark, contrastText: "#fff" },
        background: { default: surfaceMuted, paper: "#fff" },
        text: { primary: "#1f1f24", secondary: "#6b6b76" },
        divider: borderColor,
    },
    shape: { borderRadius: 12 },
    typography: {
        fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
        MuiTooltip: { defaultProps: { arrow: true } },
    },
});

export default theme;
