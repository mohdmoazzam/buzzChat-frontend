import { keyframes } from "@emotion/react";
import { ChatBubbleRounded as ChatIcon } from "@mui/icons-material";
import { Box, Grid, Skeleton, Stack, Typography } from "@mui/material"
import { orange } from "../../constants/color";

const pulse = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 112, 112, 0.45); }
  50% { transform: scale(1.06); box-shadow: 0 0 0 18px rgba(234, 112, 112, 0); }
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Dots = ({ color = orange, size = 8 }) => (
    <Stack direction="row" spacing={`${size * 0.75}px`} alignItems="center" aria-hidden>
        {[0, 1, 2].map((i) => (
            <Box
                key={i}
                sx={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    bgcolor: color,
                    animation: `${dotBounce} 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                }}
            />
        ))}
    </Stack>
);

// Full-screen branded loader for app start-up and lazy page loads
const AppLoader = () => (
    <Box
        role="status"
        aria-label="Loading"
        sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            bgcolor: "#f6f6f8",
            // Delay showing so fast loads don't flash
            animation: `${fadeIn} 0.3s ease 0.15s both`,
        }}
    >
        <Box
            sx={{
                width: 72,
                height: 72,
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                background: `linear-gradient(145deg, ${orange} 0%, #c94f7c 100%)`,
                animation: `${pulse} 1.8s ease-in-out infinite`,
            }}
        >
            <ChatIcon sx={{ fontSize: 36 }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="#2b2b2b">BuzzChat</Typography>
        <Dots />
    </Box>
);

// Compact loader for inside buttons
const ButtonLoader = ({ label }) => (
    <Stack direction="row" alignItems="center" spacing={1.5}>
        <span>{label}</span>
        <Dots color="currentColor" size={6} />
    </Stack>
);

const LayoutLoader = () => {
    return (
        <Grid container height={"calc(100vh - 4rem)"} spacing={"1rem"}>
            <Grid item sm={4} md={3} sx={{
                display: { xs: "none", sm: "block" }
            }} height={"100%"} >
                <Skeleton variant="rectangular" height={"100vh"} />
            </Grid>
            <Grid item xs={12} sm={8} lg={6} height={"100%"} >
                <Stack spacing={"1rem"}>
                    {
                        Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton key={index} variant="rectangular" height={"5rem"} />
                        ))
                    }
                </Stack>
            </Grid>
            <Grid item md={4} lg={3} height={"100%"} sx={{ display: { xs: "none", md: "block" } }}>
                <Skeleton variant="rectangular" height={"100vh"} />
            </Grid>
        </Grid>
    )
}

// Soft wave: each dot brightens and grows slightly in turn
const typingWave = keyframes`
  0%, 60%, 100% { opacity: 0.35; transform: scale(0.85); }
  30% { opacity: 1; transform: scale(1); }
`;

const bubbleIn = keyframes`
  from { opacity: 0; transform: translateY(4px) scale(0.96); }
  to { opacity: 1; transform: none; }
`;

const TypingLoader = () => (
    <Box
        role="status"
        aria-label="Typing"
        sx={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            bgcolor: "#e9e9ee",
            borderRadius: "18px",
            borderBottomLeftRadius: "6px",
            px: 1.75,
            height: 36,
            transformOrigin: "bottom left",
            animation: `${bubbleIn} 0.2s ease-out`,
        }}
    >
        {[0, 1, 2].map((i) => (
            <Box
                key={i}
                sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#8e8e99",
                    animation: `${typingWave} 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.18}s`,
                    "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.6 },
                }}
            />
        ))}
    </Box>
);

export { TypingLoader, LayoutLoader, AppLoader, ButtonLoader };