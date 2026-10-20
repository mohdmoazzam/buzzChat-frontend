import { Box, Drawer } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useErrors, useSocketsEvents } from "../../hooks/hook";
import { getOrSaveFromLocalStorage } from "../../lib/features";
import api, { CHAT_PAGE_SIZE, useMyChatsQuery } from "../../redux/api/api";
import {
  incrementNotification,
  setNewMessagesAlert,
} from "../../redux/reducers/chat";
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
const CHAT_ORDER_BY = "updatedAt";
const CHAT_ORDER = "desc";

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
    const { isLoading, isFetching, data, isError, error, refetch } = useMyChatsQuery({
      page: chatPage,
      take: CHAT_PAGE_SIZE,
      orderBy: CHAT_ORDER_BY,
      order: CHAT_ORDER,
    });
    const hasMoreChats = Boolean(data?.pagination?.hasMore);

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

    const handleDeleteChat = (e, _id, groupChat) => {
      e.preventDefault();
      dispatch(setIsDeleteMenu(true));
      dispatch(setSelectedDeleteChat({ chatId: _id, groupChat: groupChat }));
      deleteMenuAnchor.current = e.currentTarget;
    };

    const handleMobileClose = () => dispatch(setIsMobileMenu(false));

    const newMessageAlertListener = useCallback(
      (data) => {
        if (data.chatId === chatId) return;
        dispatch(setNewMessagesAlert(data));
      },
      [chatId]
    );

    const newRequestAlertListener = useCallback(() => {
      dispatch(incrementNotification());
    }, [dispatch]);

    // Only leave the open chat if it no longer exists (deleted, or you were removed).
    // With a partial list the chat may just be on a later page, so only check a complete one.
    const refetchListener = useCallback(async () => {
      const result = await reloadFirstPage();
      const fresh = result?.data;
      if (chatId && fresh && !fresh.pagination?.hasMore && !fresh.chats?.some((chat) => chat._id === chatId)) {
        navigate("/");
      }
    }, [reloadFirstPage, navigate, chatId]);

    const onlineUsersListener = useCallback((data) => {
      setOnlineUsers(data);
    }, []);

    // Keep the chat list preview live: update the last message and move the chat to the top
    const chatPreviewListener = useCallback(({ chatId: messageChatId, message } = {}) => {
      if (!messageChatId || !message) return;
      let found = false;
      dispatch(
        api.util.updateQueryData("myChats", {}, (draft) => {
          const index = draft?.chats?.findIndex((chat) => chat._id === messageChatId) ?? -1;
          if (index === -1) return;
          found = true;
          const [chat] = draft.chats.splice(index, 1);
          chat.lastMessage = {
            content: message.content ?? "",
            attachments: (message.attachments ?? []).map(({ url }) => ({ url })),
            createdAt: message.createdAt,
            sender: { _id: message.sender?._id, name: message.sender?.name },
          };
          draft.chats.unshift(chat);
        })
      );
      // Not loaded yet (new chat, or on a later page): reload page 1, where it now sits on top
      if (!found) reloadFirstPage();
    }, [dispatch, reloadFirstPage]);

    const eventHandler = {
      NEW_MESSAGE: chatPreviewListener,
      NEW_MESSAGE_ALERT: newMessageAlertListener,
      NEW_REQUEST: newRequestAlertListener,
      REFETCH_CHATS: refetchListener,
      ONLINE_USERS: onlineUsersListener,
    };

    useSocketsEvents(socket, eventHandler);

    const currentChat = data?.chats?.find((chat) => chat._id === chatId);
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
