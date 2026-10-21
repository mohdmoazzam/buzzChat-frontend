import {
  ArrowBackRounded as BackIcon,
  NotificationsNoneOutlined as BellIcon,
  CloseRounded as CloseIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import ConfirmDeleteDialog from "../components/dialogs/ConfirmDeleteDialog";
import AppLayout from "../components/layout/AppLayout";
import { useErrors } from "../hooks/hook";
import { fullName, transformImage } from "../lib/features";
import {
  useAcceptFriendRequestMutation,
  useClearNotificationsMutation,
  useDeleteNotificationMutation,
  useGetActivityQuery,
  useGetNotificationsQuery,
  useLazyGetActivityQuery,
  useMarkAllActivityReadMutation,
} from "../redux/api/api";

const SectionTitle = ({ children, action }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
    <Typography variant="subtitle2" fontWeight={700}>{children}</Typography>
    {action}
  </Stack>
);

const RowSkeleton = () => (
  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
    <Skeleton variant="circular" width={44} height={44} />
    <Box flex={1}><Skeleton width="65%" /><Skeleton width="35%" /></Box>
  </Stack>
);

const FriendRequestRow = ({ request, busy, onRespond }) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
    <Avatar src={transformImage(request.sender.avatar?.url)} sx={{ width: 44, height: 44 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ wordBreak: "break-word" }}>
        <Box component="span" fontWeight={600}>{fullName(request.sender)}</Box> sent you a friend request
      </Typography>
      <Stack direction="row" spacing={1} mt={1}>
        <Button
          size="small"
          variant="contained"
          disabled={!!busy}
          onClick={() => onRespond(request, true)}
          sx={{ borderRadius: "999px", px: 2.5, minWidth: 92 }}
        >
          {busy === "accept" ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Accept"}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={!!busy}
          onClick={() => onRespond(request, false)}
          sx={{ borderRadius: "999px", px: 2.5, minWidth: 92, borderColor: "#e4e4e7", color: "text.primary" }}
        >
          {busy === "decline" ? <CircularProgress size={16} /> : "Decline"}
        </Button>
      </Stack>
    </Box>
  </Stack>
);

// The row opens its chat; ✕ beside it (not inside: no button within a button) deletes it.
// ✕ shows on hover on desktop and always on touch screens, which have no hover
const ActivityRow = ({ item, unread, onOpen, onDelete }) => (
  <Stack
    direction="row"
    alignItems="flex-start"
    sx={{
      pr: { xs: 1, sm: 2 },
      bgcolor: unread ? "rgba(234,112,112,0.06)" : "transparent",
      "&:hover": { bgcolor: "action.hover" },
      "&:hover .notif-delete, & .notif-delete:focus-visible": { opacity: 1 },
    }}
  >
    <ButtonBase
      onClick={() => onOpen(item)}
      disabled={!item.data?.chat_id}
      sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left", gap: 1.5, pl: { xs: 2, sm: 3 }, pr: 1, py: 1.5 }}
    >
      <Avatar src={transformImage(item.actor?.avatar?.url)} sx={{ width: 44, height: 44 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} sx={{ wordBreak: "break-word" }}>{item.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{item.body}</Typography>
        <Typography variant="caption" color="text.disabled">{moment(item.created_at).fromNow()}</Typography>
      </Box>
      {unread && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", mt: 1, flexShrink: 0 }} />}
    </ButtonBase>
    <Tooltip title="Delete" disableInteractive describeChild>
      <IconButton
        className="notif-delete"
        size="small"
        aria-label={`Delete notification: ${item.title}`}
        onClick={() => onDelete(item)}
        sx={{ mt: 1.5, color: "text.secondary", opacity: 0, transition: "opacity 0.15s", "@media (hover: none)": { opacity: 0.7 } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Stack>
);

// Friend requests and in-app activity as a page (the header bell opens it, on phones and desktop)
const Notifications = () => {
  const navigate = useNavigate();

  const requestsQuery = useGetNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  // The newest page is shared with the header bell (unread count) and refreshed live
  const activityQuery = useGetActivityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [loadPage] = useLazyGetActivityQuery();
  const [respondToRequest] = useAcceptFriendRequestMutation();
  const [markAllRead] = useMarkAllActivityReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [clearNotifications, { isLoading: isClearing }] = useClearNotificationsMutation();
  const [confirmClear, setConfirmClear] = useState(false);

  // { [requestId]: "accept" | "decline" } while a response is in flight
  const [pending, setPending] = useState({});
  // What was unread when the page opened: "New" keeps showing it after everything is marked read
  const [unreadIds, setUnreadIds] = useState(null);
  // Older activity loaded with "Show more", after the newest page
  const [older, setOlder] = useState([]);
  const [olderCursor, setOlderCursor] = useState(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useErrors([
    { error: requestsQuery.error, isError: requestsQuery.isError },
    { error: activityQuery.error, isError: activityQuery.isError },
  ]);

  // Opening the page counts as seeing the activity
  useEffect(() => {
    if (!activityQuery.data || unreadIds) return;
    const ids = new Set(activityQuery.data.data.filter((item) => !item.read).map((item) => item.id));
    setUnreadIds(ids);
    if (ids.size) markAllRead();
  }, [activityQuery.data, unreadIds, markAllRead]);

  const requests = requestsQuery.data?.data ?? [];
  // Newest page first, then older pages, without duplicates (a live refresh can overlap them)
  const activity = useMemo(() => {
    const seen = new Set();
    return [...(activityQuery.data?.data ?? []), ...older].filter((item) => !seen.has(item.id) && seen.add(item.id));
  }, [activityQuery.data, older]);
  const fresh = activity.filter((item) => unreadIds?.has(item.id));
  const earlier = activity.filter((item) => !unreadIds?.has(item.id));

  // The cursor after the last page loaded: the newest page's until "Show more" is used
  const nextCursor = olderCursor === undefined ? activityQuery.data?.pagination?.next_cursor : olderCursor;

  const showMore = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { data } = await loadPage({ cursor: nextCursor });
      if (!data) return toast.error("Couldn't load older notifications");
      setOlder((list) => [...list, ...data.data]);
      setOlderCursor(data.pagination?.next_cursor ?? null);
    } finally {
      setLoadingOlder(false);
    }
  };

  const respond = async (request, accept) => {
    setPending((p) => ({ ...p, [request.id]: accept ? "accept" : "decline" }));
    const response = await respondToRequest({ request_id: request.id, accept });
    setPending(({ [request.id]: _, ...rest }) => rest);

    if (response.data) {
      toast.success(accept ? `You and ${fullName(request.sender)} are now friends` : "Request declined");
      requestsQuery.refetch();
    } else {
      toast.error(response.error?.data?.message || "Something went wrong");
    }
  };

  const openActivity = (item) => {
    if (item.data?.chat_id) navigate(`/chat/${item.data.chat_id}`);
  };

  // Gone from the list at once: the newest page is patched by the mutation, older pages here
  const deleteItem = async (item) => {
    const index = older.findIndex((entry) => entry.id === item.id);
    if (index !== -1) setOlder((list) => list.filter((entry) => entry.id !== item.id));
    const res = await deleteNotification(item.id);
    if (res.error) {
      if (index !== -1) setOlder((list) => [...list.slice(0, index), item, ...list.slice(index)]);
      toast.error(res.error.data?.message || "Couldn't delete the notification");
    }
  };

  const clearAll = async () => {
    const res = await clearNotifications();
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    setOlder([]);
    setOlderCursor(undefined);
    setConfirmClear(false);
  };

  const loading = requestsQuery.isLoading || activityQuery.isLoading;
  const empty = !loading && requests.length === 0 && activity.length === 0;

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Box sx={{ maxWidth: 720, mx: "auto", pb: 4 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            bgcolor: "#fff",
            px: { xs: 1, sm: 3 },
            py: { xs: 1, sm: 2 },
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <IconButton onClick={() => navigate("/")} aria-label="Back to chats" sx={{ display: { xs: "inline-flex", sm: "none" } }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>Notifications</Typography>
          {activity.length > 0 && (
            <Button size="small" onClick={() => setConfirmClear(true)} sx={{ borderRadius: "999px", color: "text.secondary" }}>
              Clear all
            </Button>
          )}
        </Stack>

        {loading ? (
          <>
            <SectionTitle>Friend requests</SectionTitle>
            {[0, 1].map((i) => <RowSkeleton key={i} />)}
            <SectionTitle>Activity</SectionTitle>
            {[0, 1, 2].map((i) => <RowSkeleton key={i} />)}
          </>
        ) : empty ? (
          <Stack alignItems="center" textAlign="center" spacing={1} sx={{ py: 10, px: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BellIcon sx={{ fontSize: 30, color: "text.disabled" }} />
            </Box>
            <Typography fontWeight={600} fontSize="1.05rem">You're all caught up</Typography>
            <Typography variant="body2" color="text.secondary">Friend requests and updates will show up here.</Typography>
          </Stack>
        ) : (
          <>
            {requests.length > 0 && (
              <>
                <SectionTitle
                  action={<Typography variant="caption" color="text.secondary">{requests.length} pending</Typography>}
                >
                  Friend requests
                </SectionTitle>
                <Stack divider={<Divider sx={{ ml: { xs: "72px", sm: "80px" } }} />}>
                  {requests.map((request) => (
                    <FriendRequestRow key={request.id} request={request} busy={pending[request.id]} onRespond={respond} />
                  ))}
                </Stack>
              </>
            )}

            {fresh.length > 0 && (
              <>
                <SectionTitle>New</SectionTitle>
                <Stack divider={<Divider sx={{ ml: { xs: "72px", sm: "80px" } }} />}>
                  {fresh.map((item) => <ActivityRow key={item.id} item={item} unread onOpen={openActivity} onDelete={deleteItem} />)}
                </Stack>
              </>
            )}

            {earlier.length > 0 && (
              <>
                <SectionTitle>{fresh.length > 0 ? "Earlier" : "Activity"}</SectionTitle>
                <Stack divider={<Divider sx={{ ml: { xs: "72px", sm: "80px" } }} />}>
                  {earlier.map((item) => <ActivityRow key={item.id} item={item} onOpen={openActivity} onDelete={deleteItem} />)}
                </Stack>
              </>
            )}

            {nextCursor && (
              <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
                <Button fullWidth onClick={showMore} disabled={loadingOlder} sx={{ borderRadius: "999px" }}>
                  {loadingOlder ? <CircularProgress size={18} /> : "Show more"}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>

      <ConfirmDeleteDialog
        open={confirmClear}
        handleClose={() => setConfirmClear(false)}
        deleteHandler={clearAll}
        isLoading={isClearing}
        title="Clear all notifications?"
        message="This deletes all your activity notifications. Pending friend requests stay."
        confirmLabel="Clear all"
      />
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false, mobileHeader: false })(Notifications);
