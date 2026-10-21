import {
  AddRounded as AttachIcon,
  ArrowBack as ArrowBackIcon,
  KeyboardArrowDownRounded as ArrowDownIcon,
  CheckRounded as CheckIcon,
  CloseRounded as CloseIcon,
  ContentCopyRounded as CopyIcon,
  DeleteOutlineRounded as DeleteIcon,
  EditRounded as EditIcon,
  ExitToAppRounded as LeaveIcon,
  InfoOutlined as InfoIcon,
  TimerOutlined as TimerIcon,
  ReplyRounded as ReplyIcon,
  MoreVertRounded as MoreIcon,
  SendRounded as SendIcon,
  ShortcutRounded as ForwardIcon,
} from "@mui/icons-material";
import {
  Box, Button, CircularProgress, Fab, Fade, IconButton, InputBase, ListItemIcon, ListItemText, Menu, MenuItem, Skeleton, Stack, Tooltip,
  Typography, Zoom,
} from "@mui/material";
import moment from "moment";
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import ConfirmDeleteDialog from "../components/dialogs/ConfirmDeleteDialog";
import FileMenu from "../components/dialogs/FileMenu";
import ForwardDialog from "../components/dialogs/ForwardDialog";
import GroupInfoPanel, { useGroupActions } from "../components/specific/GroupInfo";
import DisappearingDialog, { disappearingLabel } from "../components/dialogs/DisappearingDialog";

// The chat details say whether it's a group
const isGroupChat = (details) => !!details?.group_chat;
import AppLayout from "../components/layout/AppLayout";
import MessageComponent, { replySnippet } from "../components/shared/MessageComponent";
import { fullName } from "../lib/features";
import AvatarCard from "../components/shared/AvatarCard";
import { orange } from "../constants/color";
import { accentDark } from "../constants/theme";
import { useErrors, useInfiniteScrollTop, useSocketsEvents } from "../hooks/hook";
import api, {
  useDeleteMessageMutation,
  useEditMessageMutation,
  useGetChatDetailsQuery,
  useGetChatMessagesQuery,
} from "../redux/api/api";
import { getSocket } from "../socket";
import { setIsFileMenu, setProfileUserId } from "../redux/reducers/misc";
import { TypingLoader } from "../components/layout/Loaders";
import { useNavigate } from "react-router-dom";

// Messages from the same sender within this window are visually grouped
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 160;
// Same window as the server (MESSAGE_EDIT_WINDOW_MS)
const EDIT_WINDOW_MS = 15 * 60 * 1000;
// Bursts of incoming messages send one "read" to the server
const READ_DEBOUNCE_MS = 500;

const dayLabel = (date) => {
  const d = moment(date);
  if (d.isSame(moment(), "day")) return "Today";
  if (d.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return d.isSame(moment(), "year") ? d.format("ddd, D MMM") : d.format("D MMM YYYY");
};

// Group header text: "Ravi is typing…", "Ravi and Amit are typing…", "Ravi and 2 others are typing…"
const typingLabel = (names) => {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]} and ${names.length - 1} others are typing…`;
};

// The typing map without one person (same object when they weren't in it, so nothing re-renders)
const withoutTypist = (typists, userId) => {
  if (!userId || !(userId in typists)) return typists;
  const { [userId]: _removed, ...rest } = typists;
  return rest;
};

const Chat =({ chatId, chat, isOnline, onlineUsers }) => {
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
  // History page to load: null = the newest messages, then the cursor of the oldest one loaded.
  // Kept with its chat and reset during render when another chat opens, so every chat (including
  // one opened again later) starts from its newest page. An effect would reset it a render late,
  // after a request with the old cursor: the previous chat's, or this chat's older page from last time.
  const [history, setHistory] = useState({ chatId, cursor: null });
  if (history.chatId !== chatId) setHistory({ chatId, cursor: null });
  const historyCursor = history.chatId === chatId ? history.cursor : null;
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [iamTyping, setIamTyping] = useState(false);
  // Who else is typing here: { [user_id]: first_name } (groups can have several at once)
  const [typingUsers, setTypingUsers] = useState({});
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState(null);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  // Ticks while expiring messages are on screen, so they vanish on time between cleanup runs
  const [now, setNow] = useState(() => Date.now());
  const typingNames = Object.values(typingUsers);
  const userTyping = typingNames.length > 0;
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  // Message actions: the open menu ({ message, anchorEl | position }), and what it started
  const [actionMenu, setActionMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  // The message being replied to (shown above the composer until sent or cancelled)
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  // How far each other member has read: { [userId]: { read, joined } } in ms, for the ticks
  const [receipts, setReceipts] = useState({});
  const readTimer = useRef(null);
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
    { chatId, cursor: historyCursor },
    { skip: !chatId }
  );
  // currentData, not data: data keeps the previous chat's (or page's) result while the next one loads
  const historyPage = oldMessagesChunk.currentData;
  const historyPagination = historyPage?.pagination;
  // This chat's newest messages haven't arrived yet (first open, or switched from another chat)
  const isLoadingFirstPage = historyCursor === null && !historyPage && !oldMessagesChunk.isError;
  // An older page (not the first, and not a background refetch of one already shown) is on its way
  const isLoadingOlder = historyCursor !== null && oldMessagesChunk.isFetching && !historyPage;
  const olderFailed = historyCursor !== null && oldMessagesChunk.isError && !oldMessagesChunk.isFetching;
  const reachedStart = !!historyPagination && !historyPagination.has_more;
  const loadOlderMessages = useCallback(() => {
    if (!oldMessagesChunk.isFetching && historyPagination?.next_cursor) {
      setHistory({ chatId, cursor: historyPagination.next_cursor });
    }
  }, [oldMessagesChunk.isFetching, historyPagination, chatId]);

  const { data: oldMessages, setData: setOldMessages } = useInfiniteScrollTop(
    containerRef,
    !!historyPagination?.has_more,
    loadOlderMessages,
    historyPage?.messages
  );

  const details = chatDetails.currentData?.chat;
  const disappearingSeconds = details?.disappearing_seconds ?? null;
  // 1:1: either person; groups: the admin
  const canSetDisappearing = !!details && (!isGroupChat(details) || details.creator_id === user.id);
  const members = details?.members;
  const isGroup = chat?.group_chat ?? details?.group_chat;

  // Group info and leave/delete: details carry creator_id and member ids; the list item has the avatars
  const groupChat = isGroup && details ? { ...details, avatar: chat?.avatar } : null;
  const groupActions = useGroupActions({ chatId, chat: groupChat, currentUserId: user.id, panelOpen: groupInfoOpen });

  const errors = [
    { isError: chatDetails.isError, error: chatDetails.error },
    // Older pages show their own retry at the top of the chat instead of a toast
    { isError: oldMessagesChunk.isError && historyCursor === null, error: oldMessagesChunk.error },
  ];

  // Marks this chat read while it's on screen: clears the badge now, tells the server shortly after
  const markRead = useCallback(() => {
    if (!chatId || document.visibilityState !== "visible") return;
    dispatch(
      api.util.updateQueryData("myChats", {}, (draft) => {
        const current = draft?.chats?.find((item) => item.id === chatId);
        if (current) current.unread_count = 0;
      })
    );
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      readTimer.current = null;
      socket.emit("CHAT_READ", { chat_id: chatId });
    }, READ_DEBOUNCE_MS);
  }, [chatId, dispatch, socket]);

  // On open, and whenever the tab comes back into view
  useEffect(() => {
    markRead();
    const onVisible = () => markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      // Leaving before the debounce fired: still record the read for this chat
      if (readTimer.current) {
        clearTimeout(readTimer.current);
        readTimer.current = null;
        socket.emit("CHAT_READ", { chat_id: chatId });
      }
    };
  }, [chatId, markRead, socket]);

  // Each loaded page carries the latest receipts; never move a read time backwards
  const pageReceipts = oldMessagesChunk.currentData?.read_receipts;
  useEffect(() => {
    if (!pageReceipts) return;
    setReceipts((prev) => {
      const next = { ...prev };
      pageReceipts.forEach(({ user_id, last_read_at, joined_at }) => {
        next[user_id] = {
          joined: Date.parse(joined_at),
          read: Math.max(Date.parse(last_read_at), prev[user_id]?.read ?? 0),
        };
      });
      return next;
    });
  }, [pageReceipts]);

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
    setReplyingTo(null);
    draftBeforeEdit.current = message;
    setEditing(msg);
    setMessage(msg.content);
    stopTyping();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startReply = (msg) => {
    if (editing) stopEditing();
    setReplyingTo(msg);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // A sender's name in a group opens their profile
  const openProfile = useCallback((userId) => dispatch(setProfileUserId(userId)), [dispatch]);

  // Scrolls to the quoted message and flashes it; older ones may not be loaded yet
  const jumpToMessage = useCallback((messageId) => {
    const target = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (!target) {
      toast("That message is further up. Scroll up to load it.", { id: "reply-not-loaded" });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.animate?.(
      [{ backgroundColor: "rgba(234,112,112,0.22)" }, { backgroundColor: "transparent" }],
      { duration: 1400, easing: "ease-out" }
    );
  }, []);

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
    const replyTo = replyingTo;
    socket.emit("NEW_MESSAGE", { chat_id: chatId, message: text, reply_to_id: replyTo?.id }, (ack) => {
      if (ack?.ok) return;
      toast.error(ack?.error || "Message not sent. Please try again.");
      // Put the text back so nothing typed is lost
      setMessage((current) => current || text);
    });
    setMessage("");
    setReplyingTo(null);
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
    if (e.key === "Escape" && replyingTo && !editing) {
      e.preventDefault();
      setReplyingTo(null);
      return;
    }
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
    hasInitialScroll.current = false;

    return () => {
      setMessages([]);
      setMessage("");
      setOldMessages([]);
      setTypingUsers({});
      setGroupInfoOpen(false);
      setGroupMenuAnchor(null);
      setUnseenCount(0);
      setActionMenu(null);
      setEditing(null);
      setReplyingTo(null);
      setDeleteTarget(null);
      setForwardTarget(null);
      setReceipts({});
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
      // Seen as it arrives (sending my own already counts as read on the server)
      if (data.message?.sender?.id !== user.id) markRead();
      // Their message is in, so they've stopped typing even if STOP_TYPING went missing
      setTypingUsers((prev) => withoutTypist(prev, data.message?.sender?.id));
    },
    [chatId, markRead, user.id]
  );

  // Another member read up to a point: update the ticks on my messages
  const messagesReadListener = useCallback(
    ({ chat_id: readChatId, user_id, read_at } = {}) => {
      if (readChatId !== chatId || !user_id || user_id === user.id) return;
      setReceipts((prev) => ({
        ...prev,
        [user_id]: {
          joined: prev[user_id]?.joined ?? 0,
          read: Math.max(Date.parse(read_at), prev[user_id]?.read ?? 0),
        },
      }));
    },
    [chatId, user.id]
  );

  const startTypingListener = useCallback(
    (data) => {
      if (data.chat_id !== chatId || !data.user_id) return;
      setTypingUsers((prev) => ({ ...prev, [data.user_id]: data.first_name || "Someone" }));
    },
    [chatId]
  );

  const stopTypingListener = useCallback(
    (data) => {
      if (data.chat_id !== chatId) return;
      setTypingUsers((prev) => withoutTypist(prev, data.user_id));
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
        setReplyingTo((target) => (target?.id === data.message.id ? null : target));
        if (editingRef.current?.id === data.message.id) {
          setEditing(null);
          setMessage(draftBeforeEdit.current);
          draftBeforeEdit.current = "";
        }
      }
    },
    [chatId, replaceMessage]
  );

  const expiredListener = useCallback(
    ({ chat_id: expiredChatId, message_ids: ids = [] } = {}) => {
      if (expiredChatId !== chatId || !ids.length) return;
      const gone = new Set(ids);
      setMessages((list) => list.filter((msg) => !gone.has(msg.id)));
      setOldMessages((list) => list.filter((msg) => !gone.has(msg.id)));
    },
    [chatId, setOldMessages]
  );

  const disappearingListener = useCallback(
    ({ chat_id: changedChatId, seconds } = {}) => {
      if (changedChatId !== chatId) return;
      dispatch(
        api.util.updateQueryData("getChatDetails", { chatId }, (draft) => {
          if (draft?.chat) draft.chat.disappearing_seconds = seconds ?? null;
        })
      );
    },
    [chatId, dispatch]
  );

  const eventHandler = {
    MESSAGES_EXPIRED: expiredListener,
    DISAPPEARING_UPDATED: disappearingListener,
    NEW_MESSAGE: newMessagesListener,
    MESSAGE_UPDATED: changedMessageListener,
    MESSAGE_DELETED: changedMessageListener,
    MESSAGES_READ: messagesReadListener,
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
    // Disappearing messages leave the screen when they expire (the server deletes them within a minute)
    return [...byId.values()].filter((msg) => !msg.expires_at || Date.parse(msg.expires_at) > now).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at) || String(a.id).localeCompare(String(b.id))
    );
  }, [oldMessages, messages, now]);

  const hasExpiring = useMemo(() => [...oldMessages, ...messages].some((msg) => msg.expires_at), [oldMessages, messages]);
  useEffect(() => {
    if (!hasExpiring) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [hasExpiring]);
  const canSend = message.trim().length > 0;

  const subtitle = userTyping
    ? isGroup ? typingLabel(typingNames) : "typing…"
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

      // Ticks on my messages: who was in the chat when it was sent, and how many of them have read it
      let seenBy;
      let seenTotal;
      if (!msg.system && msg.sender?.id === user.id) {
        const sentAt = Date.parse(msg.created_at);
        const audience = Object.values(receipts).filter((r) => r.joined <= sentAt);
        seenTotal = audience.length;
        seenBy = audience.filter((r) => r.read >= sentAt).length;
      }

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
            isGroup={!!isGroup}
            seenBy={seenBy}
            seenTotal={seenTotal}
            onOpenMenu={openActionMenu}
            onJumpToReply={jumpToMessage}
            onOpenProfile={openProfile}
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
            {/* In groups, the name opens Group info (members, leave) */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              component="button"
              type="button"
              onClick={() => (isGroup ? setGroupInfoOpen(true) : chat.members?.[0] && dispatch(setProfileUserId(chat.members[0])))}
              aria-label={isGroup ? "Group info" : `View ${chat.name}'s profile`}
              sx={{
                minWidth: 0,
                flex: 1,
                border: "none",
                background: "none",
                p: 0,
                font: "inherit",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <AvatarCard avatar={chat.avatar} size={40} />
              <Stack sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>{chat.name}</Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: userTyping || (!isGroup && isOnline) ? "#16a34a" : "text.secondary", fontWeight: 500 }}
                >
                  {disappearingSeconds && !userTyping && (
                    <TimerIcon sx={{ fontSize: 13, verticalAlign: "-2px", mr: 0.5 }} aria-label={`Disappearing messages: ${disappearingLabel(disappearingSeconds)}`} />
                  )}
                  {subtitle}
                </Typography>
              </Stack>
            </Stack>
            {(isGroup || canSetDisappearing) && (
              <Tooltip title={isGroup ? "Group options" : "Chat options"}>
                <IconButton
                  onClick={(e) => setGroupMenuAnchor(e.currentTarget)}
                  aria-label={isGroup ? "Group options" : "Chat options"}
                  aria-haspopup="menu"
                >
                  <MoreIcon />
                </IconButton>
              </Tooltip>
            )}
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
          {isLoadingFirstPage ? (
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
              {/* Always takes its space and only becomes visible, so reaching the start doesn't shift the messages */}
              <Typography
                variant="caption"
                color="text.secondary"
                aria-hidden={!reachedStart}
                sx={{
                  alignSelf: "center",
                  px: 1.5,
                  py: 0.5,
                  mb: 1.5,
                  borderRadius: "999px",
                  bgcolor: "action.hover",
                  visibility: reachedStart ? "visible" : "hidden",
                }}
              >
                Start of conversation
              </Typography>
              {disappearingSeconds && (
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ alignSelf: "center", mb: 1.5, px: 1.5, py: 0.5, borderRadius: "999px", bgcolor: "rgba(38,148,171,0.1)", color: "#2694ab" }}>
                  <TimerIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption" fontWeight={600}>
                    New messages disappear after {disappearingLabel(disappearingSeconds)}
                  </Typography>
                </Stack>
              )}
              {renderMessages()}
            </>
          )}
          {userTyping && <Box sx={{ mt: 1 }}><TypingLoader /></Box>}
          </Box>
        </Box>

        {/* Older messages: floats over the top (out of the flow, so the messages don't jump) */}
        <Fade in={isLoadingOlder || olderFailed} unmountOnExit>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            role="status"
            aria-live="polite"
            sx={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2,
              px: 1.75,
              py: 0.75,
              borderRadius: "999px",
              bgcolor: "background.paper",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              whiteSpace: "nowrap",
            }}
          >
            {olderFailed ? (
              <>
                <Typography variant="body2" color="text.secondary">Couldn't load older messages</Typography>
                <Button size="small" onClick={() => oldMessagesChunk.refetch()} sx={{ minWidth: 0, px: 1, borderRadius: "999px" }}>
                  Retry
                </Button>
              </>
            ) : (
              <>
                <CircularProgress size={16} thickness={5} />
                <Typography variant="body2" color="text.secondary">Loading older messages…</Typography>
              </>
            )}
          </Stack>
        </Fade>

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
          pt: 1.25,
          // Clear of the iPhone home bar (needs viewport-fit=cover in index.html)
          pb: "max(10px, env(safe-area-inset-bottom))",
          bgcolor: "#fff",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {replyingTo && !editing && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1, ml: { xs: 0, sm: "50px" }, pl: 1.5, pr: 0.5, py: 0.5, borderLeft: `3px solid ${orange}`, bgcolor: "#f9f9fb", borderRadius: "8px" }}
          >
            <ReplyIcon sx={{ fontSize: 18, color: orange }} />
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: orange }}>
                Replying to {replyingTo.sender?.id === user.id ? "yourself" : fullName(replyingTo.sender)}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {replySnippet({ content: replyingTo.content, attachment: replyingTo.attachments?.[0] })}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
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
              // 16px on phones: iOS zooms the whole page into any smaller input on focus
              fontSize: { xs: "1rem", sm: "0.95rem" },
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

      <FileMenu anchorE1={fileMenuAnchor} chatId={chatId} replyToId={replyingTo?.id} onSent={() => setReplyingTo(null)} />

      {/* Message actions */}
      <Menu
        open={!!actionMenu}
        onClose={closeActionMenu}
        anchorEl={actionMenu?.anchorEl ?? null}
        anchorReference={actionMenu?.position ? "anchorPosition" : "anchorEl"}
        anchorPosition={actionMenu?.position}
        PaperProps={{ sx: { borderRadius: "12px", minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}
      >
        <MenuItem onClick={() => { closeActionMenu(); startReply(menuMessage); }}>
          <ListItemIcon><ReplyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Reply</ListItemText>
        </MenuItem>
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

      <Menu
            anchorEl={groupMenuAnchor}
            open={!!groupMenuAnchor}
            onClose={() => setGroupMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 200 } } }}
          >
            {isGroup && (
              <MenuItem onClick={() => { setGroupMenuAnchor(null); setGroupInfoOpen(true); }}>
                <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Group info</ListItemText>
              </MenuItem>
            )}
            {canSetDisappearing && (
              <MenuItem onClick={() => { setGroupMenuAnchor(null); setDisappearingOpen(true); }}>
                <ListItemIcon><TimerIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Disappearing messages" secondary={disappearingSeconds ? disappearingLabel(disappearingSeconds) : "Off"} />
              </MenuItem>
            )}
            {isGroup && (
            <MenuItem
              onClick={() => { setGroupMenuAnchor(null); groupActions.requestLeave(); }}
              sx={{ color: groupActions.canLeave ? "error.main" : "text.disabled" }}
            >
              <ListItemIcon sx={{ color: "inherit" }}><LeaveIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Leave group</ListItemText>
            </MenuItem>
            )}
            {isGroup && groupActions.isAdmin && (
              <MenuItem
                onClick={() => { setGroupMenuAnchor(null); groupActions.requestDelete(); }}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon sx={{ color: "inherit" }}><DeleteIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Delete group</ListItemText>
              </MenuItem>
            )}
          </Menu>

      <DisappearingDialog
        open={disappearingOpen}
        onClose={() => setDisappearingOpen(false)}
        chatId={chatId}
        current={disappearingSeconds}
        isGroup={!!isGroup}
      />

      {isGroup && (
        <>
          <GroupInfoPanel
            open={groupInfoOpen}
            onClose={() => setGroupInfoOpen(false)}
            chatId={chatId}
            chat={groupChat}
            currentUserId={user.id}
            onlineUsers={onlineUsers}
            actions={groupActions}
          />
          {groupActions.dialogs}
        </>
      )}
    </>
  );
};

export default AppLayout()(Chat);
