import {
  ComputerOutlined as DesktopIcon,
  SmartphoneOutlined as MobileIcon,
  TabletMacOutlined as TabletIcon,
} from "@mui/icons-material";
import { Box, Button, Divider, Skeleton, Stack, Typography } from "@mui/material";
import moment from "moment";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import ConfirmDeleteDialog from "../components/dialogs/ConfirmDeleteDialog";
import AppLayout from "../components/layout/AppLayout";
import Title from "../components/shared/Title";
import { accentSoft, surfaceMuted } from "../constants/theme";
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
const ACTIVE = "#16a34a";

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

const List = ({ children }) => <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>{children}</Box>;

const SectionLabel = ({ children, aside }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" mt={{ xs: 4, sm: 5 }} mb={0.5} minHeight={32}>
    <Typography variant="overline" color="text.secondary" fontWeight={600} letterSpacing="0.08em">
      {children}
    </Typography>
    {aside}
  </Stack>
);

const RowSkeleton = () => (
  <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
    <Skeleton variant="circular" width={44} height={44} />
    <Box sx={{ flex: 1 }}>
      <Skeleton width="45%" />
      <Skeleton width="70%" />
    </Box>
  </Stack>
);

const SessionRow = ({ session, onLogOut, isRevoking }) => {
  const Icon = DEVICE_ICONS[session.device_type] ?? DesktopIcon;
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          bgcolor: session.current ? accentSoft : surfaceMuted,
          color: session.current ? "primary.main" : "text.secondary",
        }}
      >
        <Icon sx={{ fontSize: 22 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap>{deviceName(session)}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {session.current ? (
            <Box component="span" sx={{ color: ACTIVE, fontWeight: 500 }}>Active now</Box>
          ) : (
            `Active ${moment(session.last_seen_at).fromNow()}`
          )}
          {[session.ip, `Since ${moment(session.created_at).format("D MMM YYYY")}`].filter(Boolean).map((part) => ` · ${part}`)}
        </Typography>
      </Box>
      {onLogOut && (
        <Button
          color="error"
          onClick={onLogOut}
          disabled={isRevoking}
          sx={{ borderRadius: "999px", px: 2, flexShrink: 0 }}
        >
          {isRevoking ? "Logging out…" : "Log out"}
        </Button>
      )}
    </Stack>
  );
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

  const list = sessions.data?.sessions ?? [];
  const current = list.find((session) => session.current);
  const others = list.filter((session) => !session.current);

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
          Where you’re logged in. Don’t recognize a device? Log it out and reset your password.
        </Typography>

        <SectionLabel>This device</SectionLabel>
        <List>{sessions.isLoading ? <RowSkeleton /> : current && <SessionRow session={current} />}</List>

        <SectionLabel
          aside={
            others.length > 0 && (
              <Button size="small" color="error" onClick={() => setConfirm("others")} sx={{ borderRadius: "999px", px: 1.5 }}>
                Log out all
              </Button>
            )
          }
        >
          Other devices
        </SectionLabel>
        <List>
          {sessions.isLoading ? (
            <RowSkeleton />
          ) : others.length ? (
            others.map((session, index) => (
              <React.Fragment key={session.id}>
                {index > 0 && <Divider sx={{ ml: 7.5 }} />}
                <SessionRow
                  session={session}
                  onLogOut={() => logOutDevice(session.id)}
                  isRevoking={revokingId === session.id}
                />
              </React.Fragment>
            ))
          ) : (
            <Typography color="text.secondary" py={3}>
              You’re not logged in anywhere else.
            </Typography>
          )}
        </List>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          mt={{ xs: 5, sm: 6 }}
          sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(211,47,47,0.04)" }}
        >
          <Box>
            <Typography fontWeight={600}>Log out everywhere</Typography>
            <Typography variant="body2" color="text.secondary">Ends every session, including this one.</Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            onClick={() => setConfirm("all")}
            sx={{ borderRadius: "999px", px: 2.5, flexShrink: 0 }}
          >
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

export default AppLayout({ showListOnMobile: false, sidebar: "settings" })(Devices);
