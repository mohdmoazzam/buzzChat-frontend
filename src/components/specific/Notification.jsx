import { NotificationsNoneOutlined as BellIcon } from '@mui/icons-material';
import { Avatar, Box, Button, ButtonBase, CircularProgress, Divider, Popover, Skeleton, Stack, Typography } from '@mui/material';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useErrors } from '../../hooks/hook';
import { fullName, transformImage } from '../../lib/features';
import {
  useAcceptFriendRequestMutation,
  useGetActivityQuery,
  useGetNotificationsQuery,
  useMarkAllActivityReadMutation,
} from '../../redux/api/api';
import { setIsNotification } from '../../redux/reducers/misc';

const SectionLabel = ({ children }) => (
  <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1.5, display: "block", lineHeight: 1.5 }}>
    {children}
  </Typography>
);

// Dropdown anchored to the header bell: pending friend requests, then recent activity
const Notification = ({ anchorEl }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNotification } = useSelector((state) => state.misc);

  const { isLoading, data, error, isError, refetch } = useGetNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const activityQuery = useGetActivityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [respondToRequest] = useAcceptFriendRequestMutation();
  const [markAllRead] = useMarkAllActivityReadMutation();
  // { [requestId]: "accept" | "decline" } while a response is in flight
  const [pending, setPending] = useState({});
  // What was unread when the dropdown opened; keeps the dots after everything is marked read
  const [unreadIds, setUnreadIds] = useState(null);

  useErrors([{ error, isError }, { error: activityQuery.error, isError: activityQuery.isError }]);

  // Opening the dropdown counts as seeing the activity
  useEffect(() => {
    if (!activityQuery.data || unreadIds) return;
    const ids = new Set(activityQuery.data.data.filter((item) => !item.read).map((item) => item.id));
    setUnreadIds(ids);
    if (ids.size) markAllRead();
  }, [activityQuery.data, unreadIds, markAllRead]);

  const closeHandler = () => dispatch(setIsNotification(false));

  const respond = async (request, accept) => {
    setPending((p) => ({ ...p, [request.id]: accept ? "accept" : "decline" }));
    const response = await respondToRequest({ request_id: request.id, accept });
    setPending((p) => {
      const { [request.id]: _, ...rest } = p;
      return rest;
    });

    if (response.data) {
      toast.success(accept ? `You and ${fullName(request.sender)} are now friends` : "Request declined");
      refetch();
    } else {
      toast.error(response.error?.data?.message || "Something went wrong");
    }
  };

  const openActivity = (item) => {
    if (!item.data?.chat_id) return;
    closeHandler();
    navigate(`/chat/${item.data.chat_id}`);
  };

  const requests = data?.data ?? [];
  const activity = activityQuery.data?.data ?? [];
  const loading = isLoading || activityQuery.isLoading;

  return (
    <Popover
      open={isNotification && Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={closeHandler}
      disableScrollLock
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            width: "min(380px, calc(100vw - 16px))",
            maxHeight: "min(480px, 75vh)",
            borderRadius: "16px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
        <Typography fontWeight={700}>Notifications</Typography>
        {requests.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {requests.length} {requests.length === 1 ? "request" : "requests"}
          </Typography>
        )}
      </Stack>
      <Divider />

      <Box className="custom-scrollbar" sx={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <Stack sx={{ p: 1 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flex={1}><Skeleton width="70%" /><Skeleton width="40%" /></Box>
              </Stack>
            ))}
          </Stack>
        ) : requests.length === 0 && activity.length === 0 ? (
          <Stack alignItems="center" textAlign="center" spacing={1} sx={{ py: 5, px: 3 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BellIcon sx={{ color: "text.disabled" }} />
            </Box>
            <Typography fontWeight={600}>You're all caught up</Typography>
            <Typography variant="body2" color="text.secondary">Friend requests and updates will show up here.</Typography>
          </Stack>
        ) : (
          <>
            {requests.length > 0 && (
              <>
                {activity.length > 0 && <SectionLabel>Friend requests</SectionLabel>}
                <Stack divider={<Divider sx={{ ml: "68px" }} />}>
                  {requests.map((request) => {
                    const busy = pending[request.id];
                    return (
                      <Stack key={request.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 2, py: 1.5 }}>
                        <Avatar src={transformImage(request.sender.avatar?.url)} sx={{ width: 40, height: 40 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                            <Box component="span" fontWeight={600}>{fullName(request.sender)}</Box> sent you a friend request
                          </Typography>
                          <Stack direction="row" spacing={1} mt={1}>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!!busy}
                              onClick={() => respond(request, true)}
                              sx={{ borderRadius: "999px", px: 2, minWidth: 80 }}
                            >
                              {busy === "accept" ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Accept"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={!!busy}
                              onClick={() => respond(request, false)}
                              sx={{ borderRadius: "999px", px: 2, minWidth: 80, borderColor: "#e4e4e7", color: "text.primary" }}
                            >
                              {busy === "decline" ? <CircularProgress size={16} /> : "Decline"}
                            </Button>
                          </Stack>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </>
            )}

            {activity.length > 0 && (
              <>
                {requests.length > 0 && <Divider />}
                {requests.length > 0 && <SectionLabel>Activity</SectionLabel>}
                <Stack divider={<Divider sx={{ ml: "68px" }} />}>
                  {activity.map((item) => {
                    const unread = unreadIds?.has(item.id);
                    return (
                      <ButtonBase
                        key={item.id}
                        onClick={() => openActivity(item)}
                        disabled={!item.data?.chat_id}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          gap: 1.5,
                          px: 2,
                          py: 1.5,
                          width: "100%",
                          bgcolor: unread ? "rgba(234,112,112,0.06)" : "transparent",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Avatar src={transformImage(item.actor?.avatar?.url)} sx={{ width: 40, height: 40 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{item.body}</Typography>
                          <Typography variant="caption" color="text.disabled">{moment(item.created_at).fromNow()}</Typography>
                        </Box>
                        {unread && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", mt: 1, flexShrink: 0 }} />}
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </>
            )}
          </>
        )}
      </Box>
    </Popover>
  );
};

export default Notification;
