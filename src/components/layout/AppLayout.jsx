import { Box, Drawer } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useErrors, useSocketsEvents } from "../../hooks/hook";
import { getOrSaveFromLocalStorage } from "../../lib/features";
import api, { CHAT_PAGE_SIZE, useMyChatsQuery } from "../../redux/api/api";
import { setNewMessagesAlert } from "../../redux/reducers/chat";
import {
  setIsDeleteMenu,
  setIsMobileMenu,
  setSelectedDeleteChat,
} from "../../redux/reducers/misc";
import { getSocket } from "../../socket";
import DeleteChatMenu from "../dialogs/DeleteChatMenu";
import Title from "../shared/Title";
import ChatList from "../specific/ChatList";
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
  attachments: (message.attachments ?? []).map(({ url }) => ({ url })),
  created_at: message.created_at,
  sender: message.sender ?? null,
});

const AppLayout = ({ showListOnMobile = true } = {}) => (WrappedComponent) => {
  return function AppLayoutWrapper(props) {
    const socket = getSocket();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const params = useParams();
    const chatId = params.chatId;
    const deleteMenuAnchor = useRef(null);
    const { isMobileMenu } = useSelector((state) => state.misc);
    const { newMessagesAlert } = useSelector((state) => state.chat);

    const [onlineUsers, setOnlineUsers] = useState([]);

    // Infinite scroll: each page is merged into one cached list (see myChats in api.js)
    const [chatPage, setChatPage] = useState(1);
    const [chatSearch, setChatSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Ask the server only after the user pauses typing; a new search starts at page 1
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(chatSearch.trim());
        setChatPage(1);
      }, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }, [chatSearch]);

    const { isLoading, isFetching, data, isError, error, refetch } = useMyChatsQuery({
      page: chatPage,
      take: CHAT_PAGE_SIZE,
      orderBy: CHAT_ORDER_BY,
      order: CHAT_ORDER,
      search: debouncedSearch,
    });
    const hasMoreChats = Boolean(data?.pagination?.has_more);

    const loadMoreChats = useCallback(() => {
      if (hasMoreChats && !isFetching) setChatPage((page) => page + 1);
    }, [hasMoreChats, isFetching]);

    // Start over from the newest chats (page 1 replaces the merged list)
    const reloadFirstPage = useCallback(() => {
      if (chatPage === 1) return refetch();
      setChatPage(1);
      return null;
    }, [chatPage, refetch]);

    useErrors([{ isError, error }]);

    useEffect(() => {
      getOrSaveFromLocalStorage({
        key: "NEW_MESSAGE_ALERT",
        value: newMessagesAlert,
      });
    }, [newMessagesAlert]);

    const handleDeleteChat = (e, id, groupChat) => {
      e.preventDefault();
      dispatch(setIsDeleteMenu(true));
      dispatch(setSelectedDeleteChat({ chatId: id, groupChat }));
      deleteMenuAnchor.current = e.currentTarget;
    };

    const handleMobileClose = () => dispatch(setIsMobileMenu(false));

    const newMessageAlertListener = useCallback(
      (data) => {
        if (data.chat_id === chatId) return;
        dispatch(setNewMessagesAlert({ chatId: data.chat_id }));
      },
      [chatId]
    );

    // The bell's badge reads the pending requests, so just refresh them
    const newRequestAlertListener = useCallback(() => {
      dispatch(api.util.invalidateTags(["Notifications"]));
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
      NEW_REQUEST: newRequestAlertListener,
      REFETCH_CHATS: refetchListener,
      ONLINE_USERS: onlineUsersListener,
    };

    useSocketsEvents(socket, eventHandler);

    const currentChat = data?.chats?.find((chat) => chat.id === chatId);
    const isCurrentChatOnline = !!currentChat?.members?.some((member) => onlineUsers?.includes(member));

    const listOnMobile = showListOnMobile && !chatId;

    const chatListProps = {
      chats: data?.chats,
      chatId,
      handleDeleteChat,
      newMessagesAlert,
      onlineUsers,
      isLoading,
      hasMore: hasMoreChats,
      isLoadingMore: isFetching && chatPage > 1,
      onLoadMore: loadMoreChats,
      search: chatSearch,
      onSearchChange: setChatSearch,
      // Typing (not yet sent) or a page-1 search request in flight
      isSearching: chatSearch.trim() !== debouncedSearch || (isFetching && chatPage === 1 && !!debouncedSearch),
    };

    return (
      <>
        <Title />
        {/* Full-height app; on wide screens the app is a centered column
            on one continuous white page, edged by thin dividers */}
        <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", bgcolor: "#fff" }}>
          <Header />

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
                width: { sm: 300, md: 320 },
                flexShrink: 0,
                borderRight: "1px solid",
                borderColor: "divider",
                minHeight: 0,
              }}
            >
              <ChatList {...chatListProps} />
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
                />
              </Box>
            </Box>

          </Box>
        </Box>
        </Box>

        {/* Mobile drawer for chat list */}
        <Drawer
          open={isMobileMenu}
          onClose={handleMobileClose}
          PaperProps={{ sx: { width: "85vw", maxWidth: 360 } }}
        >
          <ChatList {...chatListProps} onSelect={handleMobileClose} />
        </Drawer>

        <DeleteChatMenu
          dispatch={dispatch}
          deleteOptionAnchor={deleteMenuAnchor}
        />
      </>
    );
  };
};

export default AppLayout;
