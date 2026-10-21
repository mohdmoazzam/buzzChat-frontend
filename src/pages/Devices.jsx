import {
  ComputerOutlined as DesktopIcon,
  SmartphoneOutlined as MobileIcon,
  TabletMacOutlined as TabletIcon,
} from "@mui/icons-material";
import { Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import moment from "moment";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import ConfirmDeleteDialog from "../components/dialogs/ConfirmDeleteDialog";
import AppLayout from "../components/layout/AppLayout";
import Title from "../components/shared/Title";
import { useErrors } from "../hooks/hook";
import {
  useGetSessionsQuery,
  useRevokeAllSessionsMutation,
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
} from "../redux/api/api";
import { userNotExists } from "../redux/reducers/auth";
import { getSocket } from "../socket";

const DEVICE_ICONS = { mobile: MobileIcon, tablet: TabletIcon };

const deviceName = ({ browser, os }) => {
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || "Unknown device";
};

const CONFIRMS = {
  others: {
    title: "Log out other devices?",
    message: "Every device except this one will need to log in again.",
    confirmLabel: "Log out",
  },
  all: {
    title: "Log out everywhere?",
    message: "Every device, including this one, will need to log in again.",
    confirmLabel: "Log out all",
  },
};

const Devices = () => {
  const dispatch = useDispatch();
  const socket = getSocket();
  const sessions = useGetSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeOthers, { isLoading: isRevokingOthers }] = useRevokeOtherSessionsMutation();
  const [revokeAll, { isLoading: isRevokingAll }] = useRevokeAllSessionsMutation();
  const [confirm, setConfirm] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  useErrors([{ isError: sessions.isError, error: sessions.error }]);

  // This device first, then most recently active
  const list = [...(sessions.data?.sessions ?? [])].sort((a, b) => Number(b.current) - Number(a.current));
  const hasOthers = list.some((session) => !session.current);

  const logOutDevice = async (sessionId) => {
    setRevokingId(sessionId);
    const res = await revokeSession(sessionId);
    setRevokingId(null);
    if (res.data) toast.success(res.data.message);
    else toast.error(res.error?.data?.message || "Something went wrong");
  };

  const confirmHandler = async () => {
    if (confirm === "others") {
      const res = await revokeOthers();
      setConfirm(null);
      if (res.data) toast.success(res.data.message);
      else toast.error(res.error?.data?.message || "Something went wrong");
      return;
    }
    // Disconnect first, so this tab doesn't also get the server's SESSION_REVOKED
    socket?.disconnect();
    const res = await revokeAll();
    setConfirm(null);
    if (res.data) {
      dispatch(userNotExists());
      toast.success(res.data.message);
    } else {
      socket?.connect();
      toast.error(res.error?.data?.message || "Something went wrong");
    }
  };

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Devices · BuzzChat" />
      <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 4, sm: 7 }, maxWidth: 760 }}>
        <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.75rem", sm: "2.25rem" }}>
          Devices
        </Typography>
        <Typography color="text.secondary" mt={0.5}>
          Where you're logged in. If you don't recognize a device, log it out and reset your password.
        </Typography>

        <Stack spacing={1.5} mt={4}>
          {sessions.isLoading
            ? [0, 1].map((key) => <Skeleton key={key} variant="rounded" height={76} sx={{ borderRadius: "16px" }} />)
            : list.map((session) => {
                const Icon = DEVICE_ICONS[session.device_type] ?? DesktopIcon;
                return (
                  <Stack
                    key={session.id}
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: "16px" }}
                  >
                    <Icon sx={{ color: "text.secondary", fontSize: 28 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontWeight={600} noWrap>{deviceName(session)}</Typography>
                        {session.current && <Chip label="This device" size="small" color="primary" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {[
                          session.ip,
                          session.current ? "Active now" : `Active ${moment(session.last_seen_at).fromNow()}`,
                          `Logged in ${moment(session.created_at).format("D MMM YYYY")}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </Box>
                    {!session.current && (
                      <Button
                        onClick={() => logOutDevice(session.id)}
                        disabled={revokingId === session.id}
                        sx={{ borderRadius: "999px", flexShrink: 0 }}
                      >
                        Log out
                      </Button>
                    )}
                  </Stack>
                );
              })}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={4}>
          <Button
            variant="outlined"
            onClick={() => setConfirm("others")}
            disabled={!hasOthers}
            sx={{ borderRadius: "999px", px: 2.5 }}
          >
            Log out other devices
          </Button>
          <Button variant="contained" color="error" onClick={() => setConfirm("all")} sx={{ borderRadius: "999px", px: 2.5 }}>
            Log out everywhere
          </Button>
        </Stack>
      </Box>

      <ConfirmDeleteDialog
        open={!!confirm}
        handleClose={() => setConfirm(null)}
        deleteHandler={confirmHandler}
        isLoading={isRevokingOthers || isRevokingAll}
        {...CONFIRMS[confirm ?? "others"]}
      />
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false })(Devices);
