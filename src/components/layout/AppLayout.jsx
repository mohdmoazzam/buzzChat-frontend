import { Box, Drawer } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useErrors, useSocketsEvents } from "../../hooks/hook";
import { getOrSaveFromLocalStorage } from "../../lib/features";
import { useMyChatsQuery } from "../../redux/api/api";
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

const AppLayout = ({ showListOnMobile = true } = {}) => (WrappedComponent) => {
  return (props) => {
    const socket = getSocket();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const params = useParams();
    const chatId = params.chatId;
    const deleteMenuAnchor = useRef(null);
    const { isMobileMenu } = useSelector((state) => state.misc);
    const { newMessagesAlert } = useSelector((state) => state.chat);

    const [onlineUsers, setOnlineUsers] = useState([]);

    const { isLoading, data, isError, error, refetch } = useMyChatsQuery("");

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

    const refetchListener = useCallback(() => {
      refetch();
      navigate("/");
    }, [refetch, navigate]);

    const onlineUsersListener = useCallback((data) => {
      setOnlineUsers(data);
    }, []);

    const eventHandler = {
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
    };

    return (
      <>
        <Title />
        <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
          <Header />

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
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
