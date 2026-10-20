import { ForumOutlined as ForumIcon, Search as SearchIcon } from "@mui/icons-material";
import { Box, Button, CircularProgress, InputAdornment, InputBase, Skeleton, Stack, Typography } from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setIsSearch } from "../../redux/reducers/misc";
import ChatItem from "../shared/ChatItem";

const ChatList = ({
  w = "100%",
  chats = [],
  chatId,
  onlineUsers = [],
  newMessagesAlert = [],
  handleDeleteChat,
  isLoading = false,
  onSelect,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  const dispatch = useDispatch();
  const [filter, setFilter] = useState("");
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  // Load the next page when the bottom of the list scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onLoadMore(),
      { root: scrollRef.current, rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  const filteredChats = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return chats ?? [];
    return (chats ?? []).filter((chat) => chat.name?.toLowerCase().includes(q));
  }, [chats, filter]);

  return (
    <Stack width={w} height="100%" sx={{ bgcolor: "#fff" }}>
      <Box sx={{ px: 2, pt: 2.5, pb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} mb={1.5}>Chats</Typography>
        <InputBase
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search chats"
          fullWidth
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 20, color: "text.disabled" }} />
            </InputAdornment>
          }
          sx={{
            bgcolor: "#f4f4f6",
            borderRadius: "10px",
            px: 1.5,
            py: 0.75,
            fontSize: "0.9rem",
          }}
        />
      </Box>

      <Box ref={scrollRef} className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
        {isLoading ? (
          <Stack spacing={1.5} px={2} pt={1}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={44} height={44} />
                <Stack flex={1}>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : filteredChats.length > 0 ? (
          <Stack spacing={0.5}>
            {filteredChats.map((chat) => {
              const { _id, name, groupChat, avatar, members, lastMessage } = chat;

              const newMessageAlert = newMessagesAlert?.find(
                ({ chatId }) => chatId === _id
              );

              const isOnline = members?.some((member) =>
                onlineUsers?.includes(member)
              );

              return (
                <ChatItem
                  key={_id}
                  newMessageAlert={newMessageAlert}
                  isOnline={isOnline}
                  avatar={avatar}
                  name={name}
                  _id={_id}
                  groupChat={groupChat}
                  lastMessage={lastMessage}
                  sameSender={chatId === _id}
                  handleDeleteChat={handleDeleteChat}
                  onSelect={onSelect}
                />
              );
            })}
            {/* Infinite-scroll trigger + loader */}
            <Box ref={sentinelRef} sx={{ height: 1 }} />
            {isLoadingMore && (
              <Stack alignItems="center" sx={{ py: 1.5 }}>
                <CircularProgress size={20} sx={{ color: "text.disabled" }} />
              </Stack>
            )}
          </Stack>
        ) : (
          <Stack alignItems="center" textAlign="center" spacing={1.5} px={3} pt={6}>
            <ForumIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography fontWeight={600}>
              {filter ? "No chats match your search" : "No chats yet"}
            </Typography>
            {!filter && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Find people and send a friend request to start chatting.
                </Typography>
                <Button variant="contained" size="small" onClick={() => dispatch(setIsSearch(true))}>
                  Find people
                </Button>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
};

export default ChatList;
