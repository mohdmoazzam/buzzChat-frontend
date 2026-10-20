import { NotificationsNoneOutlined as BellIcon } from '@mui/icons-material';
import { Avatar, Box, Button, CircularProgress, Divider, Popover, Skeleton, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useErrors } from '../../hooks/hook';
import { fullName, transformImage } from '../../lib/features';
import { useAcceptFriendRequestMutation, useGetNotificationsQuery } from '../../redux/api/api';
import { setIsNotification } from '../../redux/reducers/misc';

// Dropdown anchored to the header bell
const Notification = ({ anchorEl }) => {
  const dispatch = useDispatch();
  const { isNotification } = useSelector((state) => state.misc);

  const { isLoading, data, error, isError, refetch } = useGetNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [respondToRequest] = useAcceptFriendRequestMutation();
  // { [requestId]: "accept" | "decline" } while a response is in flight
  const [pending, setPending] = useState({});

  useErrors([{ error, isError }]);

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

  const requests = data?.data ?? [];

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
        {isLoading ? (
          <Stack sx={{ p: 1 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flex={1}><Skeleton width="70%" /><Skeleton width="40%" /></Box>
              </Stack>
            ))}
          </Stack>
        ) : requests.length === 0 ? (
          <Stack alignItems="center" textAlign="center" spacing={1} sx={{ py: 5, px: 3 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BellIcon sx={{ color: "text.disabled" }} />
            </Box>
            <Typography fontWeight={600}>You're all caught up</Typography>
            <Typography variant="body2" color="text.secondary">New friend requests will show up here.</Typography>
          </Stack>
        ) : (
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
        )}
      </Box>
    </Popover>
  );
};

export default Notification;
