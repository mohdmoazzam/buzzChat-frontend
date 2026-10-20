import {
  AttachFile as AttachFileIcon,
  ArrowBack as ArrowBackIcon,
  SendRounded as SendIcon,
} from "@mui/icons-material";
import { Box, IconButton, InputBase, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import FileMenu from "../components/dialogs/FileMenu";
import AppLayout from "../components/layout/AppLayout";
import MessageComponent from "../components/shared/MessageComponent";
import AvatarCard from "../components/shared/AvatarCard";
import { orange } from "../constants/color";
import { accentDark } from "../constants/theme";
import { useErrors, useSocketsEvents } from "../hooks/hook";
import {
  useGetChatDetailsQuery,
  useGetChatMessagesQuery,
} from "../redux/api/api";
import { getSocket } from "../socket";
import { useInfiniteScrollTop } from "6pp";
import { setIsFileMenu } from "../redux/reducers/misc";
import { removeNewMessagesAlert } from "../redux/reducers/chat";
import { TypingLoader } from "../components/layout/Loaders";
import { useNavigate } from "react-router-dom";

const Chat = ({ chatId, chat, isOnline }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const typingTimeout = useRef(null);
  const bottomRef = useRef(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [iamTyping, setIamTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);

  const socket = getSocket();

  const chatDetails = useGetChatDetailsQuery({ chatId }, { skip: !chatId });
  const oldMessagesChunk = useGetChatMessagesQuery(
    { chatId, page },
    { skip: !chatId }
  );

  const { data: oldMessages, setData: setOldMessages } = useInfiniteScrollTop(
    containerRef,
    oldMessagesChunk.data?.totalPages,
    page,
    setPage,
    oldMessagesChunk.data?.messages
  );

  const members = chatDetails?.data?.chat?.members;
  const isGroup = chat?.groupChat ?? chatDetails?.data?.chat?.groupChat;

  const errors = [
    { isError: chatDetails.isError, error: chatDetails.error },
    { isError: oldMessagesChunk.isError, error: oldMessagesChunk.error },
  ];

  const handleFileOpen = (e) => {
    dispatch(setIsFileMenu(true));
    setFileMenuAnchor(e.currentTarget);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit("NEW_MESSAGE", { chatId, members, message });
    setMessage("");
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (iamTyping) {
      socket.emit("STOP_TYPING", { members, chatId });
      setIamTyping(false);
    }
  };

  useEffect(() => {
    socket.emit("CHAT_JOINED", { userId: user._id, members });
    dispatch(removeNewMessagesAlert({ chatId }));

    return () => {
      setMessages([]);
      setMessage("");
      setOldMessages([]);
      setPage(1);
      setUserTyping(false);
      socket.emit("CHAT_LEAVED", { userId: user._id, members });
    };
  }, [chatId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userTyping]);

  useEffect(() => {
    if (chatDetails.isError) {
      return navigate("/");
    }
  }, [chatDetails.isError]);

  const messageChangeHandler = (e) => {
    setMessage(e.target.value);
    if (!iamTyping) {
      socket.emit("START_TYPING", { members, chatId });
      setIamTyping(true);
    }
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      socket.emit("STOP_TYPING", { members, chatId });
      setIamTyping(false);
    }, 2000);
  };

  const newMessagesListener = useCallback(
    (data) => {
      if (data.chatId !== chatId) return;
      setMessages((prev) => [...prev, data.message]);
    },
    [chatId]
  );

  const startTypingListener = useCallback(
    (data) => {
      if (data.chatId !== chatId) return;
      setUserTyping(true);
    },
    [chatId]
  );

  const stopTypingListener = useCallback(
    (data) => {
      if (data.chatId !== chatId) return;
      setUserTyping(false);
    },
    [chatId]
  );

  const alertListener = useCallback((data) => {
    if (data.chatId !== chatId) return;

    const messageForAlert = {
      _id: `alert-${Date.now()}`,
      system: true,
      content: data.message,
      sender: {
        _id: "system",
        name: "BuzzChat",
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, messageForAlert]);
  }, [chatId]);

  const eventHandler = {
    NEW_MESSAGE: newMessagesListener,
    START_TYPING: startTypingListener,
    STOP_TYPING: stopTypingListener,
    ALERT: alertListener,
  };

  useSocketsEvents(socket, eventHandler);

  useErrors(errors);

  const allMessages = [...oldMessages, ...messages];
  const canSend = message.trim().length > 0;

  const subtitle = userTyping
    ? "typing…"
    : isGroup
      ? `${(members?.length ?? 0)} members`
      : isOnline ? "Online" : "Offline";

  return (
    <>
      {/* Chat header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: { xs: 1, sm: 2.5 },
          height: 64,
          flexShrink: 0,
          bgcolor: "#fff",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <IconButton
          onClick={() => navigate("/")}
          aria-label="Back to chats"
          sx={{ display: { xs: "inline-flex", sm: "none" } }}
        >
          <ArrowBackIcon />
        </IconButton>
        {chat ? (
          <>
            <AvatarCard avatar={chat.avatar} size={40} />
            <Stack sx={{ minWidth: 0 }}>
              <Typography fontWeight={600} noWrap>{chat.name}</Typography>
              <Typography
                variant="caption"
                sx={{ color: userTyping || (!isGroup && isOnline) ? "#16a34a" : "text.secondary", fontWeight: 500 }}
              >
                {subtitle}
              </Typography>
            </Stack>
          </>
        ) : (
          <>
            <Skeleton variant="circular" width={40} height={40} />
            <Stack><Skeleton width={120} /><Skeleton width={60} /></Stack>
          </>
        )}
      </Stack>

      {/* Messages */}
      <Box
        className="custom-scrollbar"
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY: "auto",
          px: { xs: 1.5, sm: 3 },
          py: 2,
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        {chatDetails.isLoading || oldMessagesChunk.isLoading ? (
          <Stack spacing={1.5}>
            {[60, 40, 70, 35].map((w, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={`${w}%`}
                height={44}
                sx={{ alignSelf: i % 2 ? "flex-end" : "flex-start", borderRadius: "16px" }}
              />
            ))}
          </Stack>
        ) : allMessages.length === 0 ? (
          <Stack flex={1} alignItems="center" justifyContent="center" textAlign="center" spacing={1} color="text.secondary">
            <Typography fontSize="2rem">👋</Typography>
            <Typography fontWeight={600} color="text.primary">No messages yet</Typography>
            <Typography variant="body2">Say hello to start the conversation.</Typography>
          </Stack>
        ) : (
          allMessages.map((message, index) => {
            const prev = allMessages[index - 1];
            const showSender =
              isGroup && !message.system && (!prev || prev.system || prev.sender?._id !== message.sender?._id);
            return (
              <MessageComponent
                key={message._id ?? index}
                message={message}
                user={user}
                showSender={showSender}
              />
            );
          })
        )}
        {userTyping && <TypingLoader />}
        <div ref={bottomRef} />
      </Box>

      {/* Composer */}
      <Box
        component="form"
        onSubmit={submitHandler}
        sx={{
          flexShrink: 0,
          px: { xs: 1, sm: 2.5 },
          py: 1.5,
          bgcolor: "#fff",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            bgcolor: "#f4f4f6",
            borderRadius: "24px",
            pl: 0.75,
            pr: 0.75,
            py: 0.5,
            border: "1px solid transparent",
            transition: "border-color 0.15s, background-color 0.15s",
            "&:focus-within": { borderColor: orange, bgcolor: "#fff" },
          }}
        >
          <Tooltip title="Attach files">
            <IconButton onClick={handleFileOpen} aria-label="Attach files" sx={{ color: "text.secondary" }}>
              <AttachFileIcon sx={{ transform: "rotate(30deg)" }} />
            </IconButton>
          </Tooltip>

          <InputBase
            placeholder="Type a message…"
            value={message}
            onChange={messageChangeHandler}
            fullWidth
            autoComplete="off"
            inputProps={{ "aria-label": "Message" }}
            sx={{ fontSize: "0.95rem", py: 0.5 }}
          />

          <IconButton
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            sx={{
              bgcolor: orange,
              color: "#fff",
              width: 40,
              height: 40,
              transition: "transform 0.15s, background-color 0.15s",
              "&:hover": { bgcolor: accentDark },
              "&.Mui-disabled": { bgcolor: "#e4e4e8", color: "#fff" },
              "&:not(.Mui-disabled):active": { transform: "scale(0.92)" },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <FileMenu anchorE1={fileMenuAnchor} chatId={chatId} />
    </>
  );
};

export default AppLayout()(Chat);
