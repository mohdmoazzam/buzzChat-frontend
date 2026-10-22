import { Box, CircularProgress, Stack, Switch, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import AppLayout from "../components/layout/AppLayout";
import Title from "../components/shared/Title";
import { disablePush, enablePush, isPushOn, needsHomeScreen, pushSupported } from "../lib/push";

// Settings → Notifications: push notifications for this browser (each device is turned on separately)
const NotificationSettings = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [on, setOn] = useState(null); // null while checking
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const blocked = supported && Notification.permission === "denied";

  useEffect(() => {
    isPushOn(user?.id).then(setOn, () => setOn(false));
  }, [user?.id]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush({ token });
        setOn(false);
        toast.success("Push notifications turned off on this device");
      } else {
        await enablePush({ token, userId: user?.id });
        setOn(true);
        toast.success("Push notifications turned on");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  let hint = "Get notified about new messages and group invites when BuzzChat isn't open on this device.";
  if (!supported) {
    hint = needsHomeScreen()
      ? "On iPhone and iPad, add BuzzChat to your Home Screen first (Share → Add to Home Screen), then open it from there."
      : "This browser doesn't support push notifications.";
  } else if (blocked) {
    hint = "Notifications are blocked for this site. Allow them in your browser's site settings, then turn this on.";
  }

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Notifications · BuzzChat" />
      <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 4, sm: 7 }, maxWidth: 560 }}>
        <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.75rem", sm: "2.25rem" }}>
          Notifications
        </Typography>
        <Typography color="text.secondary" mt={0.5}>
          Choose how BuzzChat reaches you on this device.
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          mt={{ xs: 4, sm: 5 }}
          sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: "16px" }}
        >
          <Box flex={1} minWidth={0}>
            <Typography fontWeight={600}>Push notifications</Typography>
            <Typography variant="body2" color="text.secondary">{hint}</Typography>
          </Box>
          {on === null || busy ? (
            <CircularProgress size={24} sx={{ mx: 1.5 }} />
          ) : (
            <Switch
              checked={on}
              onChange={toggle}
              disabled={!supported || (blocked && !on)}
              inputProps={{ "aria-label": "Push notifications on this device" }}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={1.5}>
          Logging out of this device turns its notifications off.
        </Typography>
      </Box>
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false, sidebar: "settings" })(NotificationSettings);
