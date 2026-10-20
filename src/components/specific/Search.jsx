import {
  CheckRounded as CheckIcon,
  CloseRounded as CloseIcon,
  PersonAddAlt1Rounded as AddIcon,
  PersonSearchOutlined as EmptyIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  InputBase,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { orange } from "../../constants/color";
import { transformImage } from "../../lib/features";
import { useLazySearchUserQuery, useSendFriendRequestMutation } from "../../redux/api/api";
import { setIsNotification, setIsSearch } from "../../redux/reducers/misc";

const Search = () => {
  const { isSearch } = useSelector((state) => state.misc);
  const dispatch = useDispatch();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [pendingIds, setPendingIds] = useState([]);
  const latestSearch = useRef(0);

  const [searchUser] = useLazySearchUserQuery();
  const [sendFriendRequest] = useSendFriendRequestMutation();

  const closeHandler = () => dispatch(setIsSearch(false));

  // Debounced search; ignore responses that arrive out of order
  useEffect(() => {
    const searchId = ++latestSearch.current;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchUser(query.trim());
        if (searchId === latestSearch.current) setUsers(data?.data ?? []);
      } finally {
        if (searchId === latestSearch.current) setIsSearching(false);
      }
    }, query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [query, searchUser]);

  const addFriendHandler = async (user) => {
    setPendingIds((ids) => [...ids, user._id]);
    const response = await sendFriendRequest({ userId: user._id });
    setPendingIds((ids) => ids.filter((id) => id !== user._id));

    if (response.data) {
      toast.success(`Request sent to ${user.name}`);
      setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, requestStatus: "sent" } : u)));
    } else {
      toast.error(response.error?.data?.message || "Couldn't send request");
      if (response.error?.status === 409) {
        setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, requestStatus: "sent" } : u)));
      }
    }
  };

  const openNotifications = () => {
    closeHandler();
    dispatch(setIsNotification(true));
  };

  return (
    <Dialog
      open={isSearch}
      onClose={closeHandler}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : "20px", height: fullScreen ? "100%" : "min(600px, 85vh)" } }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Find people</Typography>
          <Typography variant="body2" color="text.secondary">Send a request to start chatting</Typography>
        </Box>
        <IconButton onClick={closeHandler} aria-label="Close" sx={{ color: "text.secondary" }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Search input */}
      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <InputBase
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username"
          fullWidth
          inputProps={{ "aria-label": "Search people", maxLength: 50 }}
          startAdornment={<SearchIcon sx={{ color: "text.disabled", mr: 1, fontSize: 20 }} />}
          endAdornment={
            query && (
              <IconButton size="small" onClick={() => setQuery("")} aria-label="Clear search" sx={{ color: "text.disabled" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )
          }
          sx={{
            bgcolor: "#f4f4f6",
            borderRadius: "12px",
            px: 1.5,
            py: 1,
            border: "1px solid transparent",
            transition: "border-color 0.15s, background-color 0.15s, box-shadow 0.15s",
            "&.Mui-focused": { bgcolor: "#fff", borderColor: orange, boxShadow: "0 0 0 4px rgba(234,112,112,0.15)" },
          }}
        />
      </Box>

      {/* Results */}
      <Box className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 2 }}>
        {!isSearching && users.length > 0 && (
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 1, display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {query.trim() ? `${users.length} result${users.length > 1 ? "s" : ""}` : "People you may know"}
          </Typography>
        )}

        {isSearching ? (
          <Stack spacing={0.5}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ px: 1, py: 1.25 }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box flex={1}>
                  <Skeleton width="45%" />
                  <Skeleton width="30%" />
                </Box>
                <Skeleton variant="rounded" width={72} height={32} sx={{ borderRadius: "999px" }} />
              </Stack>
            ))}
          </Stack>
        ) : users.length === 0 ? (
          <Stack alignItems="center" textAlign="center" spacing={1} sx={{ pt: 6, px: 3 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
              <EmptyIcon sx={{ color: "text.disabled" }} />
            </Box>
            <Typography fontWeight={600}>
              {query.trim() ? "No one found" : "No new people yet"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query.trim() ? `We couldn't find anyone matching "${query.trim()}".` : "Everyone here is already your friend."}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0.25}>
            {users.map((user) => (
              <PersonRow
                key={user._id}
                user={user}
                isPending={pendingIds.includes(user._id)}
                onAdd={() => addFriendHandler(user)}
                onRespond={openNotifications}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Dialog>
  );
};

const PersonRow = ({ user, isPending, onAdd, onRespond }) => {
  const { name, username, avatar, requestStatus } = user;

  let action;
  if (requestStatus === "sent") {
    action = (
      <Button
        size="small"
        disabled
        startIcon={<CheckIcon />}
        sx={{ borderRadius: "999px", px: 1.5, "&.Mui-disabled": { color: "text.secondary", bgcolor: "#f4f4f6" } }}
      >
        Requested
      </Button>
    );
  } else if (requestStatus === "received") {
    action = (
      <Button size="small" variant="outlined" onClick={onRespond} sx={{ borderRadius: "999px", px: 1.5 }}>
        Respond
      </Button>
    );
  } else {
    action = (
      <Button
        size="small"
        variant="contained"
        onClick={onAdd}
        disabled={isPending}
        startIcon={isPending ? null : <AddIcon />}
        sx={{ borderRadius: "999px", px: 1.75, minWidth: 76, "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.7 } }}
      >
        {isPending ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Add"}
      </Button>
    );
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ px: 1, py: 1.1, borderRadius: "12px", transition: "background-color 0.15s", "&:hover": { bgcolor: "#f8f8fa" } }}
    >
      <Avatar src={transformImage(avatar)} sx={{ width: 44, height: 44 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap>{name}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {requestStatus === "received" ? "Sent you a request" : username ? `@${username}` : ""}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
};

export default Search;
