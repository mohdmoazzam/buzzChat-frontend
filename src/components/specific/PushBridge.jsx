import { NotificationsActiveOutlined as BellIcon } from "@mui/icons-material";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { enablePush, shouldPromptForPush, snoozePushPrompt, syncPush } from "../../lib/push";
import { ButtonLoader } from "../layout/Loaders";

// Wait a moment after the app opens, so the prompt doesn't land on top of the first render
const PROMPT_DELAY_MS = 2500;

// Mounted for logged-in users: keeps this browser's push subscription linked to the session,
// offers to turn push on, and opens the chat when a notification is clicked while the app is open (public/sw.js)
const PushBridge = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const userId = user?.id;
  const [prompt, setPrompt] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await syncPush({ token, userId });
      if (!cancelled && (await shouldPromptForPush({ token, userId }))) setPrompt(true);
    }, PROMPT_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, token]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event) => {
      const url = event.data?.type === "OPEN_URL" && event.data.url;
      if (typeof url === "string" && url.startsWith("/")) navigate(url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  // The browser only shows its permission popup in response to a click, hence this button
  const turnOn = async () => {
    setEnabling(true);
    try {
      await enablePush({ token, userId });
      toast.success("Push notifications turned on");
      setPrompt(false);
    } catch (error) {
      toast.error(error.message);
      // Blocked or dismissed in the browser's popup: don't keep asking
      snoozePushPrompt();
      setPrompt(false);
    } finally {
      setEnabling(false);
    }
  };

  const notNow = () => {
    snoozePushPrompt();
    setPrompt(false);
  };

  // Settings → Notifications has its own switch
  if (!prompt || pathname === "/settings/notifications") return null;

  return (
    <Paper
      role="dialog"
      aria-label="Turn on notifications"
      elevation={8}
      sx={{
        position: "fixed",
        zIndex: 1400,
        bottom: { xs: 16, sm: 24 },
        left: { xs: 16, sm: "auto" },
        right: { xs: 16, sm: 24 },
        maxWidth: { sm: 380 },
        p: 2,
        borderRadius: "16px",
      }}
    >
      <Stack direction="row" spacing={1.5}>
        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: "12px", display: "grid", placeItems: "center", bgcolor: "rgba(38,148,171,0.12)", color: "#2694ab" }}>
          <BellIcon />
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={700}>Turn on notifications?</Typography>
          <Typography variant="body2" color="text.secondary">
            Get new messages on this device even when BuzzChat is closed.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1.5}>
            <Button onClick={notNow} disabled={enabling} sx={{ borderRadius: "999px", color: "text.secondary" }}>Not now</Button>
            <Button variant="contained" onClick={turnOn} disabled={enabling} sx={{ borderRadius: "999px", px: 2.5, minWidth: 96 }}>
              {enabling ? <ButtonLoader label="Turning on" /> : "Turn on"}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default PushBridge;
