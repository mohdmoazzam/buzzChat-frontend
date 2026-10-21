import {
  AddRounded as AttachIcon,
  ArrowBack as ArrowBackIcon,
  KeyboardArrowDownRounded as ArrowDownIcon,
  CheckRounded as CheckIcon,
  CloseRounded as CloseIcon,
  ContentCopyRounded as CopyIcon,
  DeleteOutlineRounded as DeleteIcon,
  EditRounded as EditIcon,
  SendRounded as SendIcon,
  ShortcutRounded as ForwardIcon,
} from "@mui/icons-material";
import {
  Box, CircularProgress, Fab, IconButton, InputBase, ListItemIcon, ListItemText, Menu, MenuItem, Skeleton, Stack, Tooltip,
  Typography, Zoom,
} from "@mui/material";
import moment from "moment";
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import ConfirmDeleteDialog from "../components/dialogs/ConfirmDeleteDialog";
import FileMenu from "../components/dialogs/FileMenu";
import ForwardDialog from "../components/dialogs/ForwardDialog";
import AppLayout from "../components/layout/AppLayout";
import MessageComponent from "../components/shared/MessageComponent";
import AvatarCard from "../components/shared/AvatarCard";
import { orange } from "../constants/color";
import { accentDark } from "../constants/theme";
import { useErrors, useInfiniteScrollTop, useSocketsEvents } from "../hooks/hook";
import {
  useDeleteMessageMutation,
  useEditMessageMutation,
  useGetChatDetailsQuery,
  useGetChatMessagesQuery,
} from "../redux/api/api";
import { getSocket } from "../socket";
import { setIsFileMenu } from "../redux/reducers/misc";
import { removeNewMessagesAlert } from "../redux/reducers/chat";
import { TypingLoader } from "../components/layout/Loaders";
import { useNavigate } from "react-router-dom";

// Messages from the same sender within this window are visually grouped
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 160;
// Same window as the server (MESSAGE_EDIT_WINDOW_MS)
const EDIT_WINDOW_MS = 15 * 60 * 1000;

const dayLabel = (date) => {
  const d = moment(date);
  if (d.isSame(moment(), "day")) return "Today";
  if (d.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return d.isSame(moment(), "year") ? d.format("ddd, D MMM") : d.format("D MMM YYYY");
};

const Chat = ({ chatId, chat, isOnline }) => {
  const { user } = useSelector((state) => state.auth);
  const { isFileMenu, uploadingLoader } = useSelector((state) => state.misc);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const hasInitialScroll = useRef(false);
  const contentRef = useRef(null);
  const stickToBottom = useRef(true);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [iamTyping, setIamTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  // Message actions: the open menu ({ message, anchorEl | position }), and what it started
  const [actionMenu, setActionMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  // The unsent draft, put back after an edit
  const draftBeforeEdit = useRef("");
  // For socket listeners, which shouldn't re-subscribe on every edit
  const editingRef = useRef(null);
  editingRef.current = editing;

  const [editMessage, { isLoading: isSavingEdit }] = useEditMessageMutation();
  const [deleteMessage, { isLoading: isDeleting }] = useDeleteMessageMutation();

  const socket = getSocket();

  const chatDetails = useGetChatDetailsQuery({ chatId }, { skip: !chatId });
  const oldMessagesChunk = useGetChatMessagesQuery(
    { chatId, page },
    { skip: !chatId }
  );

  const { data: oldMessages, setData: setOldMessages } = useInfiniteScrollTop(
    containerRef,
    oldMessagesChunk.data?.total_pages,
    page,
    setPage,
    oldMessagesChunk.data?.messages
  );

  const members = chatDetails?.data?.chat?.members;
  const isGroup = chat?.group_chat ?? chatDetails?.data?.chat?.group_chat;

  const errors = [
    { isError: chatDetails.isError, error: chatDetails.error },
    { isError: oldMessagesChunk.isError, error: oldMessagesChunk.error },
  ];

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setUnseenCount(0);
  }, []);

  const handleFileOpen = (e) => {
    dispatch(setIsFileMenu(true));
    setFileMenuAnchor(e.currentTarget);
  };

  const stopTyping = () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (iamTyping) {
      socket.emit("STOP_TYPING", { chat_id: chatId });
      setIamTyping(false);
    }
  };

  // Swaps an edited/deleted message in place, wherever it's loaded
  const replaceMessage = useCallback((updated) => {
    const swap = (list) => list.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg));
    setMessages(swap);
    setOldMessages(swap);
  }, [setOldMessages]);

  const startEditing = (msg) => {
    draftBeforeEdit.current = message;
    setEditing(msg);
    setMessage(msg.content);
    stopTyping();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const stopEditing = () => {
    setEditing(null);
    setMessage(draftBeforeEdit.current);
    draftBeforeEdit.current = "";
    inputRef.current?.focus();
  };

  const saveEdit = async (text) => {
    if (text === editing.content) return stopEditing();
    const res = await editMessage({ chatId, messageId: editing.id, content: text });
    if (res.data) {
      replaceMessage(res.data.message);
      stopEditing();
    } else {
      toast.error(res.error?.data?.message || "Something went wrong");
    }
  };

  const submitHandler = (e) => {
    e?.preventDefault();
    const text = message.trim();
    if (!text) return;
    if (editing) {
      if (!isSavingEdit) saveEdit(text);
      return;
    }
    socket.emit("NEW_MESSAGE", { chat_id: chatId, message: text });
    setMessage("");
    stopTyping();
    inputRef.current?.focus();
  };

  const openActionMenu = useCallback((menu) => setActionMenu(menu), []);
  const closeActionMenu = () => setActionMenu(null);

  // What the open menu offers for its message
  const menuMessage = actionMenu?.message;
  const menuIsMine = !!menuMessage && menuMessage.sender?.id === user.id;
  const canCopy = !!menuMessage?.content;
  const canEdit = menuIsMine && !!menuMessage?.content &&
    Date.now() - new Date(menuMessage.created_at).getTime() < EDIT_WINDOW_MS;

  const copyHandler = async () => {
    closeActionMenu();
    try {
      await navigator.clipboard.writeText(menuMessage.content);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy the message");
    }
  };

  const deleteHandler = async () => {
    const res = await deleteMessage({ chatId, messageId: deleteTarget.id });
    if (res.data) {
      replaceMessage(res.data.message);
      if (editing?.id === deleteTarget.id) stopEditing();
      setDeleteTarget(null);
    } else {
      toast.error(res.error?.data?.message || "Something went wrong");
    }
  };

  const keyDownHandler = (e) => {
    if (e.key === "Escape" && editing) {
      e.preventDefault();
      stopEditing();
      return;
    }
    // Enter sends, Shift+Enter adds a new line
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitHandler();
    }
  };

  useEffect(() => {
    socket.emit("CHAT_JOINED");
    dispatch(removeNewMessagesAlert({ chatId }));
    hasInitialScroll.current = false;

    return () => {
      setMessages([]);
      setMessage("");
      setOldMessages([]);
      setPage(1);
      setUserTyping(false);
      setUnseenCount(0);
      setActionMenu(null);
      setEditing(null);
      setDeleteTarget(null);
      setForwardTarget(null);
      draftBeforeEdit.current = "";
      socket.emit("CHAT_LEAVED");
    };
  }, [chatId]);

  // Keep pinned to the bottom while content grows (images loading, new messages)
  useEffect(() => {
    const el = containerRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [chatId]);

  useEffect(() => {
    stickToBottom.current = true;
  }, [chatId]);

  // Land at the newest message once the first page has rendered
  useLayoutEffect(() => {
    if (!hasInitialScroll.current && oldMessages.length > 0) {
      hasInitialScroll.current = true;
      scrollToBottom("auto");
    }
  }, [oldMessages.length, scrollToBottom]);

  // New live messages: follow along if already near the bottom (or if it's mine)
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    const mine = last?.sender?.id === user.id;
    if (isNearBottom || mine) scrollToBottom();
    else setUnseenCount((n) => n + 1);
    // Only new arrivals, not edits/deletes swapped in place
  }, [messages.length]);

  useEffect(() => {
    if (userTyping && isNearBottom) scrollToBottom();
  }, [userTyping]);

  useEffect(() => {
    if (chatDetails.isError) {
      return navigate("/");
    }
  }, [chatDetails.isError]);

  const scrollHandler = () => {
    const el = containerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    stickToBottom.current = near;
    setIsNearBottom(near);
    if (near) setUnseenCount(0);
  };

  const messageChangeHandler = (e) => {
    setMessage(e.target.value);
    // Editing an old message isn't "typing" for the other side
    if (editing) return;
    if (!iamTyping) {
      socket.emit("START_TYPING", { chat_id: chatId });
      setIamTyping(true);
    }
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      socket.emit("STOP_TYPING", { chat_id: chatId });
      setIamTyping(false);
    }, 2000);
  };

  const newMessagesListener = useCallback(
    (data) => {
      if (data.chat_id !== chatId) return;
      setMessages((prev) => [...prev, data.message]);
    },
    [chatId]
  );

  const startTypingListener = useCallback(
    (data) => {
      if (data.chat_id !== chatId) return;
      setUserTyping(true);
    },
    [chatId]
  );

  const stopTypingListener = useCallback(
    (data) => {
      if (data.chat_id !== chatId) return;
      setUserTyping(false);
    },
    [chatId]
  );

  const alertListener = useCallback((data) => {
    if (data.chat_id !== chatId) return;

    const messageForAlert = {
      id: `alert-${Date.now()}`,
      system: true,
      content: data.message,
      sender: {
        id: "system",
        first_name: "BuzzChat",
        last_name: "",
      },
      chat_id: chatId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, messageForAlert]);
  }, [chatId]);

  // Edited or deleted (by anyone, including me on another device)
  const changedMessageListener = useCallback(
    (data) => {
      if (data.chat_id !== chatId || !data.message) return;
      replaceMessage(data.message);
      if (data.message.deleted_at) {
        // Close anything still pointing at it
        setActionMenu((menu) => (menu?.message.id === data.message.id ? null : menu));
        setForwardTarget((target) => (target?.id === data.message.id ? null : target));
        if (editingRef.current?.id === data.message.id) {
          setEditing(null);
          setMessage(draftBeforeEdit.current);
          draftBeforeEdit.current = "";
        }
      }
    },
    [chatId, replaceMessage]
  );

  const eventHandler = {
    NEW_MESSAGE: newMessagesListener,
    MESSAGE_UPDATED: changedMessageListener,
    MESSAGE_DELETED: changedMessageListener,
    START_TYPING: startTypingListener,
    STOP_TYPING: stopTypingListener,
    ALERT: alertListener,
  };

  useSocketsEvents(socket, eventHandler);

  useErrors(errors);

  // A refetch (e.g. on tab focus) can return messages that already arrived live: keep one of each, in time order
  const allMessages = useMemo(() => {
    const byId = new Map();
    [...oldMessages, ...messages].forEach((msg) => byId.set(msg.id, msg));
    return [...byId.values()].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at) || String(a.id).localeCompare(String(b.id))
    );
  }, [oldMessages, messages]);
  const canSend = message.trim().length > 0;

  const subtitle = userTyping
    ? "typing…"
    : isGroup
      ? `${(members?.length ?? 0)} members`
      : isOnline ? "Online" : "Offline";

  // Decide grouping, sender labels and date separators
  const renderMessages = () =>
    allMessages.map((msg, index) => {
      const prev = allMessages[index - 1];
      const next = allMessages[index + 1];
      const sameGroup = (a, b) =>
        a && b && !a.system && !b.system &&
        a.sender?.id === b.sender?.id &&
        moment(a.created_at).isSame(b.created_at, "day") &&
        Math.abs(new Date(b.created_at) - new Date(a.created_at)) < GROUP_WINDOW_MS;

      const newDay = !prev || !moment(prev.created_at).isSame(msg.created_at, "day");
      const isFirst = !sameGroup(prev, msg);
      const isLast = !sameGroup(msg, next);

      return (
        <Fragment key={msg.id ?? index}>
          {newDay && (
            <Box sx={{ alignSelf: "center", my: 1.5 }}>
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", color: "text.secondary", px: 1.5, py: 0.5, borderRadius: "999px", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
              >
                {dayLabel(msg.created_at)}
              </Typography>
            </Box>
          )}
          <MessageComponent
            message={msg}
            user={user}
            isFirst={isFirst || newDay}
            isLast={isLast}
            showSender={isGroup && (isFirst || newDay)}
            onOpenMenu={openActionMenu}
          />
        </Fragment>
      );
    });

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
      <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Box
          className="custom-scrollbar"
          ref={containerRef}
          onScroll={scrollHandler}
          sx={{
            height: "100%",
            overflowX: "hidden",
            overflowY: "auto",
            px: { xs: 1.5, sm: 3, md: 5 },
            py: 2,
            bgcolor: "background.default",
          }}
        >
          <Box ref={contentRef} sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          {chatDetails.isLoading || oldMessagesChunk.isLoading ? (
            <Stack spacing={1} sx={{ mt: "auto" }}>
              {[55, 35, 65, 30, 45].map((w, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width={`${w}%`}
                  height={40}
                  sx={{ alignSelf: i % 2 ? "flex-end" : "flex-start", borderRadius: "18px" }}
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
            <>
              {/* Push short conversations to the bottom */}
              <Box sx={{ flex: 1 }} />
              {renderMessages()}
            </>
          )}
          {userTyping && <Box sx={{ mt: 1 }}><TypingLoader /></Box>}
          </Box>
        </Box>

        {/* Jump to latest */}
        <Zoom in={!isNearBottom}>
          <Fab
            size="small"
            onClick={() => scrollToBottom()}
            aria-label="Jump to latest messages"
            sx={{
              position: "absolute",
              right: { xs: 12, sm: 24 },
              bottom: 16,
              bgcolor: "#fff",
              color: "text.primary",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              "&:hover": { bgcolor: "#fafafa" },
            }}
          >
            {unseenCount > 0 && (
              <Box
                sx={{
                  position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, px: 0.5,
                  borderRadius: "10px", bgcolor: orange, color: "#fff", fontSize: "0.7rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {unseenCount}
              </Box>
            )}
            <ArrowDownIcon />
          </Fab>
        </Zoom>
      </Box>

      {/* Composer */}
      <Box
        component="form"
        onSubmit={submitHandler}
        sx={{
          flexShrink: 0,
          px: { xs: 1, sm: 2.5, md: 4 },
          py: 1.25,
          bgcolor: "#fff",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {editing && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1, ml: { xs: 0, sm: "50px" }, pl: 1.5, pr: 0.5, py: 0.5, borderLeft: `3px solid ${orange}`, bgcolor: "#f9f9fb", borderRadius: "8px" }}
          >
            <EditIcon sx={{ fontSize: 18, color: orange }} />
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: orange }}>Editing message</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{editing.content}</Typography>
            </Stack>
            <IconButton size="small" onClick={stopEditing} aria-label="Cancel editing">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
        <Stack direction="row" alignItems="flex-end" spacing={1}>
          <Tooltip title={isFileMenu ? "" : uploadingLoader ? "Sending files…" : "Attach files"} disableInteractive>
            <span>
              <IconButton
                onClick={handleFileOpen}
                disabled={uploadingLoader}
                aria-label="Attach files"
                sx={{ bgcolor: isFileMenu ? "#ececf0" : "#f4f4f6", color: "text.secondary", width: 42, height: 42, flexShrink: 0, "&:hover": { bgcolor: "#ececf0" } }}
              >
                {uploadingLoader ? (
                  <CircularProgress size={18} sx={{ color: orange }} />
                ) : (
                  <AttachIcon sx={{ transition: "transform 0.2s", transform: isFileMenu ? "rotate(45deg)" : "none" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <InputBase
            inputRef={inputRef}
            placeholder="Message"
            value={message}
            onChange={messageChangeHandler}
            onKeyDown={keyDownHandler}
            onBlur={stopTyping}
            fullWidth
            multiline
            maxRows={5}
            autoComplete="off"
            inputProps={{ "aria-label": "Message" }}
            sx={{
              bgcolor: "#f4f4f6",
              borderRadius: "21px",
              px: 2,
              py: 1.1,
              minHeight: 42,
              fontSize: "0.95rem",
              lineHeight: 1.4,
              border: "1px solid transparent",
              transition: "border-color 0.15s, background-color 0.15s",
              "&.Mui-focused": { bgcolor: "#fff", borderColor: "#e4e4e7" },
            }}
          />

          <IconButton
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            sx={{
              bgcolor: orange,
              color: "#fff",
              width: 42,
              height: 42,
              flexShrink: 0,
              transition: "transform 0.15s, background-color 0.15s, opacity 0.15s",
              "&:hover": { bgcolor: accentDark },
              "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.4 },
              "&:not(.Mui-disabled):active": { transform: "scale(0.92)" },
            }}
          >
            {editing ? (
              isSavingEdit ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <CheckIcon sx={{ fontSize: 22 }} />
            ) : (
              <SendIcon sx={{ fontSize: 20, ml: "2px" }} />
            )}
          </IconButton>
        </Stack>
        <Typography variant="caption" color="text.disabled" sx={{ display: { xs: "none", md: "block" }, pl: "58px", pt: 0.5, fontSize: "0.7rem" }}>
          {editing ? "Enter to save · Esc to cancel" : "Enter to send · Shift + Enter for a new line"}
        </Typography>
      </Box>

      <FileMenu anchorE1={fileMenuAnchor} chatId={chatId} />

      {/* Message actions */}
      <Menu
        open={!!actionMenu}
        onClose={closeActionMenu}
        anchorEl={actionMenu?.anchorEl ?? null}
        anchorReference={actionMenu?.position ? "anchorPosition" : "anchorEl"}
        anchorPosition={actionMenu?.position}
        PaperProps={{ sx: { borderRadius: "12px", minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}
      >
        {canCopy && (
          <MenuItem onClick={copyHandler}>
            <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Copy</ListItemText>
          </MenuItem>
        )}
        {canEdit && (
          <MenuItem onClick={() => { closeActionMenu(); startEditing(menuMessage); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { closeActionMenu(); setForwardTarget(menuMessage); }}>
          <ListItemIcon><ForwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Forward</ListItemText>
        </MenuItem>
        {menuIsMine && (
          <MenuItem onClick={() => { closeActionMenu(); setDeleteTarget(menuMessage); }} sx={{ color: "error.main" }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete for everyone</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        handleClose={() => setDeleteTarget(null)}
        deleteHandler={deleteHandler}
        title="Delete for everyone?"
        message="This message will be replaced with “This message was deleted” for everyone in this chat."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      <ForwardDialog
        open={!!forwardTarget}
        handleClose={() => setForwardTarget(null)}
        chatId={chatId}
        message={forwardTarget}
      />
    </>
  );
};

export default AppLayout()(Chat);
