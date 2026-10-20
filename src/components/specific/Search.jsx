import {
  ChatBubbleOutlineRounded as ChatIcon,
  CheckCircleRounded as FriendIcon,
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
  Divider,
  IconButton,
  InputBase,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { orange } from "../../constants/color";
import { transformImage } from "../../lib/features";
import { useLazySearchUserQuery, useSendFriendRequestMutation } from "../../redux/api/api";
import { setIsNotification, setIsSearch } from "../../redux/reducers/misc";

const PAGE_SIZE = 20;

const Search = () => {
  const { isSearch } = useSelector((state) => state.misc);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [pendingIds, setPendingIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const latestSearch = useRef(0);
  const resultsRef = useRef(null);
  const sentinelRef = useRef(null);

  const [searchUser] = useLazySearchUserQuery();
  const [sendFriendRequest] = useSendFriendRequestMutation();

  const closeHandler = () => dispatch(setIsSearch(false));

  // Debounced search for page 1; ignore responses that arrive out of order
  useEffect(() => {
    const searchId = ++latestSearch.current;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchUser({ search: query.trim(), page: 1, take: PAGE_SIZE });
        if (searchId !== latestSearch.current) return;
        setUsers(data?.data ?? []);
        setPagination(data?.pagination ?? null);
        setPage(1);
      } finally {
        if (searchId === latestSearch.current) setIsSearching(false);
      }
    }, query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [query, searchUser]);

  const hasMore = Boolean(pagination?.hasMore);

  // Next page for the same search, appended to the list
  const loadMore = useCallback(async () => {
    if (!hasMore || isSearching || isLoadingMore) return;
    const searchId = latestSearch.current;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const { data } = await searchUser({ search: query.trim(), page: nextPage, take: PAGE_SIZE });
      if (searchId !== latestSearch.current || !data) return;
      setUsers((list) => {
        const seen = new Set(list.map((u) => u._id));
        return [...list, ...data.data.filter((u) => !seen.has(u._id))];
      });
      setPagination(data.pagination);
      setPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isSearching, isLoadingMore, page, query, searchUser]);

  // Load more when the bottom of the results scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && loadMore(),
      { root: resultsRef.current, rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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

  // Friends: jump straight to the existing conversation
  const openChat = (chatId) => {
    if (!chatId) return;
    closeHandler();
    navigate(`/chat/${chatId}`);
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
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : "20px", height: fullScreen ? "100%" : "min(680px, 90vh)", maxWidth: fullScreen ? "100%" : 520 } }}
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

      <Divider />

      {/* Results */}
      <Box ref={resultsRef} className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", px: 1.5, pt: 1.5, pb: 2 }}>
        {!isSearching && users.length > 0 && (
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 1, display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {query.trim() ? `${pagination?.total ?? users.length} result${(pagination?.total ?? users.length) === 1 ? "" : "s"}` : "People"}
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
              {query.trim() ? "No one found" : "No one else is here yet"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query.trim() ? `We couldn't find anyone matching "${query.trim()}".` : "Invite friends to join BuzzChat, then find them here."}
            </Typography>
          </Stack>
        ) : (
          <Stack divider={<Divider sx={{ ml: "68px", mr: 1 }} />}>
            {users.map((user) => (
              <PersonRow
                key={user._id}
                user={user}
                isPending={pendingIds.includes(user._id)}
                onAdd={() => addFriendHandler(user)}
                onRespond={openNotifications}
                onMessage={() => openChat(user.chatId)}
              />
            ))}
          </Stack>
        )}
        {/* Infinite-scroll trigger + loader */}
        {!isSearching && hasMore && <Box ref={sentinelRef} sx={{ height: 1 }} />}
        {isLoadingMore && (
          <Stack alignItems="center" sx={{ py: 1.5 }}>
            <CircularProgress size={20} sx={{ color: "text.disabled" }} />
          </Stack>
        )}
      </Box>
    </Dialog>
  );
};

const PersonRow = ({ user, isPending, onAdd, onRespond, onMessage }) => {
  const { name, username, avatar, requestStatus } = user;

  let action;
  if (requestStatus === "friend") {
    action = (
      <Button
        size="small"
        variant="outlined"
        onClick={onMessage}
        startIcon={<ChatIcon sx={{ fontSize: "16px !important" }} />}
        sx={{ borderRadius: "999px", px: 1.5, borderColor: "#e4e4e7", color: "text.primary", "&:hover": { borderColor: "#d4d4d8", bgcolor: "#fafafa" } }}
      >
        Message
      </Button>
    );
  } else if (requestStatus === "sent") {
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
        {requestStatus === "friend" ? (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <FriendIcon sx={{ fontSize: 15, color: "#16a34a", flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "#16a34a", fontWeight: 600, flexShrink: 0 }}>Friends</Typography>
            {username && (
              <Typography variant="body2" color="text.secondary" noWrap>· @{username}</Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" noWrap>
            {requestStatus === "received" ? "Sent you a request" : requestStatus === "sent" ? "Request sent · waiting for reply" : username ? `@${username}` : ""}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
};

export default Search;
