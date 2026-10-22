import { Box, Drawer } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useErrors, useSocketsEvents } from "../../hooks/hook";
import api, { CHAT_PAGE_SIZE, useMyChatsQuery, useUnreadTotalQuery } from "../../redux/api/api";
import {
  setIsDeleteMenu,
  setIsMobileMenu,
  setSelectedDeleteChat,
} from "../../redux/reducers/misc";
import { getSocket } from "../../socket";
import DeleteChatMenu from "../dialogs/DeleteChatMenu";
import UserProfileDialog from "../specific/UserProfileDialog";
import Title from "../shared/Title";
import ChatList from "../specific/ChatList";
import SettingsNav from "../specific/SettingsNav";
import Header from "./Header";
import { APP_MAX_WIDTH } from "../../constants/theme";

// Most recently active chats first
const CHAT_ORDER_BY = "updated_at";
const CHAT_ORDER = "desc";
const SEARCH_DEBOUNCE_MS = 300;

// A socket message in the shape of the chat list's last_message
const toPreview = (message) => ({
  id: message.id,
  content: message.content ?? "",
  deleted_at: message.deleted_at ?? null,
  attachments: (message.attachments ?? []).map(({ url, duration_ms }) => ({ url, duration_ms })),
  created_at: message.created_at,
  sender: message.sender ?? null,
});

// sidebar: "chats" (the chat list) or "settings" (the settings sections)
// mobileHeader: false for pages with their own top bar (and back button) on phones
const AppLayout = ({ showListOnMobile = true, sidebar = "chats", mobileHeader = true } = {}) => (WrappedComponent) => {
  return function AppLayoutWrapper(props) {
    const socket = getSocket();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const params = useParams();
    const chatId = params.chatId;
    const deleteMenuAnchor = useRef(null);
    const { isMobileMenu } = useSelector((state) => state.misc);
    const myId = useSelector((state) => state.auth.user?.id);
    const { data: unreadData } = useUnreadTotalQuery();
    const unreadTotal = unreadData?.unread_count ?? 0;

    const [onlineUsers, setOnlineUsers] = useState([]);

    // Infinite scroll: each page is merged into one cached list (see myChats in api.js).
    // null = the first page; then the next_cursor of the last page loaded
    const [chatCursor, setChatCursor] = useState(null);
    const [chatSearch, setChatSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Ask the server only after the user pauses typing; a new search starts from the first page
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(chatSearch.trim());
        setChatCursor(null);
      }, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }, [chatSearch]);

    const { isLoading, isFetching, data, isError, error, refetch } = useMyChatsQuery({
      cursor: chatCursor,
      take: CHAT_PAGE_SIZE,
      orderBy: CHAT_ORDER_BY,
      order: CHAT_ORDER,
      search: debouncedSearch,
    });
    const hasMoreChats = Boolean(data?.pagination?.has_more);
    const nextChatCursor = data?.pagination?.next_cursor ?? null;

    const loadMoreChats = useCallback(() => {
      if (hasMoreChats && nextChatCursor && !isFetching) setChatCursor(nextChatCursor);
    }, [hasMoreChats, nextChatCursor, isFetching]);

    // Start over from the newest chats (the first page replaces the merged list)
    const reloadFirstPage = useCallback(() => {
      if (chatCursor === null) return refetch();
      setChatCursor(null);
      return null;
    }, [chatCursor, refetch]);

    useErrors([{ isError, error }]);

    const handleDeleteChat = (e, id, groupChat) => {
      e.preventDefault();
      dispatch(setIsDeleteMenu(true));
      dispatch(setSelectedDeleteChat({ chatId: id, groupChat }));
      deleteMenuAnchor.current = e.currentTarget;
    };

    const handleMobileClose = () => dispatch(setIsMobileMenu(false));

    // Sets a chat's unread badge in the cached chat list
    const setChatUnread = useCallback((targetChatId, update) => {
      dispatch(
        api.util.updateQueryData("myChats", {}, (draft) => {
          const chat = draft?.chats?.find((item) => item.id === targetChatId);
          if (chat) chat.unread_count = update(chat.unread_count ?? 0);
        })
      );
    }, [dispatch]);

    const newMessageAlertListener = useCallback(
      ({ chat_id: alertChatId } = {}) => {
        // The open chat marks itself read while the tab is visible
        if (alertChatId === chatId && document.visibilityState === "visible") return;
        setChatUnread(alertChatId, (count) => count + 1);
        dispatch(api.util.invalidateTags(["Unread"]));
      },
      [chatId, setChatUnread, dispatch]
    );

    // I read a chat (here or on another device): clear its badge. Others' reads are the open chat's ticks.
    const messagesReadListener = useCallback(
      ({ chat_id: readChatId, user_id } = {}) => {
        if (user_id !== myId) return;
        setChatUnread(readChatId, () => 0);
        dispatch(api.util.invalidateTags(["Unread"]));
      },
      [myId, setChatUnread, dispatch]
    );

    // The bell's badge reads the pending requests, so just refresh them
    const newRequestAlertListener = useCallback(() => {
      dispatch(api.util.invalidateTags(["Notifications"]));
    }, [dispatch]);

    // A new in-app notification: refresh the bell's list and unread count
    const newNotificationListener = useCallback(() => {
      dispatch(api.util.invalidateTags(["Activity"]));
    }, [dispatch]);

    // Only leave the open chat if it no longer exists (deleted, or you were removed).
    // With a partial list the chat may just be on a later page, so only check a complete one.
    const refetchListener = useCallback(async () => {
      const result = await reloadFirstPage();
      const fresh = result?.data;
      if (chatId && fresh && !fresh.pagination?.has_more && !fresh.chats?.some((chat) => chat.id === chatId)) {
        navigate("/");
      }
    }, [reloadFirstPage, navigate, chatId]);

    const onlineUsersListener = useCallback((data) => {
      setOnlineUsers(data);
    }, []);

    const userLastSeenListener = useCallback(({ user_id, last_seen_at } = {}) => {
      if (!user_id) return;
      dispatch(
        api.util.updateQueryData("myChats", {}, (draft) => {
          const chat = draft?.chats?.find((c) => !c.group_chat && c.members?.includes(user_id));
          if (chat) chat.other_last_seen_at = last_seen_at;
        })
      );
    }, [dispatch]);

    // Keep the chat list preview live: update the last message and move the chat to the top
    const chatPreviewListener = useCallback(({ chat_id: messageChatId, message } = {}) => {
      if (!messageChatId || !message) return;
      let found = false;
      dispatch(
        api.util.updateQueryData("myChats", {}, (draft) => {
          const index = draft?.chats?.findIndex((chat) => chat.id === messageChatId) ?? -1;
          if (index === -1) return;
          found = true;
          const [chat] = draft.chats.splice(index, 1);
          chat.last_message = toPreview(message);
          draft.chats.unshift(chat);
        })
      );
      // Not loaded yet (new chat, or on a later page): reload page 1, where it now sits on top
      if (!found) reloadFirstPage();
    }, [dispatch, reloadFirstPage]);

    // An edited or deleted message: refresh the preview if it's the chat's latest one (order stays)
    const changedMessageListener = useCallback(({ chat_id: messageChatId, message } = {}) => {
      if (!messageChatId || !message) return;
      dispatch(
        api.util.updateQueryData("myChats", {}, (draft) => {
          const chat = draft?.chats?.find((item) => item.id === messageChatId);
          if (chat?.last_message?.id !== message.id) return;
          chat.last_message = { ...toPreview(message), sender: message.sender ?? chat.last_message.sender };
        })
      );
    }, [dispatch]);

    const eventHandler = {
      NEW_MESSAGE: chatPreviewListener,
      MESSAGE_UPDATED: changedMessageListener,
      MESSAGE_DELETED: changedMessageListener,
      NEW_MESSAGE_ALERT: newMessageAlertListener,
      MESSAGES_READ: messagesReadListener,
      NEW_REQUEST: newRequestAlertListener,
      NEW_NOTIFICATION: newNotificationListener,
      REFETCH_CHATS: refetchListener,
      // Disappearing messages: a chat's latest message may be gone, so its preview needs refreshing
      MESSAGES_EXPIRED: reloadFirstPage,
      ONLINE_USERS: onlineUsersListener,
      USER_LAST_SEEN: userLastSeenListener,
    };

    useSocketsEvents(socket, eventHandler);

    const currentChat = data?.chats?.find((chat) => chat.id === chatId);
    const isCurrentChatOnline = !!currentChat?.members?.some((member) => onlineUsers?.includes(member));

    const listOnMobile = showListOnMobile && !chatId;
    const isSettings = sidebar === "settings";

    const chatListProps = {
      chats: data?.chats,
      chatId,
      handleDeleteChat,
      onlineUsers,
      isLoading,
      hasMore: hasMoreChats,
      isLoadingMore: isFetching && chatCursor !== null,
      onLoadMore: loadMoreChats,
      search: chatSearch,
      onSearchChange: setChatSearch,
      // Typing (not yet sent) or a page-1 search request in flight
      isSearching: chatSearch.trim() !== debouncedSearch || (isFetching && chatCursor === null && !!debouncedSearch),
    };

    return (
      <>
        <Title title={unreadTotal > 0 ? `(${unreadTotal > 99 ? "99+" : unreadTotal}) BuzzChat` : "BuzzChat"} />
        {/* Full-height app; on wide screens the app is a centered column
            on one continuous white page, edged by thin dividers */}
        <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", bgcolor: "#fff" }}>
          {/* Inside a chat (or a page with its own bar) on a phone, that header with its back button is the only bar */}
          <Box sx={{ display: { xs: chatId || !mobileHeader ? "none" : "block", sm: "block" }, flexShrink: 0 }}>
            <Header showMenu={isSettings} />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, bgcolor: "#fff" }}>
          <Box
            sx={{
              height: "100%",
              maxWidth: APP_MAX_WIDTH,
              mx: "auto",
              display: "flex",
              [`@media (min-width: ${APP_MAX_WIDTH + 1}px)`]: {
                borderLeft: "1px solid",
                borderRight: "1px solid",
                borderColor: "divider",
              },
            }}
          >
            {/* Chat list sidebar (tablet and up) */}
            <Box
              sx={{
                display: { xs: "none", sm: "block" },
                width: isSettings ? { sm: 220, md: 248 } : { sm: 300, md: 320 },
                flexShrink: 0,
                borderRight: "1px solid",
                borderColor: "divider",
                minHeight: 0,
              }}
            >
              {isSettings ? <SettingsNav /> : <ChatList {...chatListProps} />}
            </Box>

            {/* Main content */}
            <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {/* On phones, the home screen is the chat list itself */}
              {listOnMobile && (
                <Box sx={{ display: { xs: "block", sm: "none" }, height: "100%" }}>
                  <ChatList {...chatListProps} />
                </Box>
              )}
              <Box sx={{ display: { xs: listOnMobile ? "none" : "flex", sm: "flex" }, flexDirection: "column", height: "100%", minHeight: 0 }}>
                <WrappedComponent
                  {...props}
                  chatId={chatId}
                  chat={currentChat}
                  isOnline={isCurrentChatOnline}
                  onlineUsers={onlineUsers}
                />
              </Box>
            </Box>

          </Box>
        </Box>
        </Box>

        {/* Phones: the settings sections (the sidebar is hidden there). The chat list needs no drawer:
            on a phone it's the home screen, which the logo and every back button lead to. */}
        {isSettings && (
          <Drawer
            open={isMobileMenu}
            onClose={handleMobileClose}
            PaperProps={{ sx: { width: "85vw", maxWidth: 360 } }}
          >
            <SettingsNav onSelect={handleMobileClose} />
          </Drawer>
        )}

        <UserProfileDialog />

        <DeleteChatMenu
          dispatch={dispatch}
          deleteOptionAnchor={deleteMenuAnchor}
        />
      </>
    );
  };
};

export default AppLayout;
