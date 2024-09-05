import { Drawer, Grid, Skeleton } from "@mui/material";
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
import Profile from "../specific/Profile";
import Header from "./Header";

const AppLayout = () => (WrappedComponent) => {
  return (props) => {
    const { user } = useSelector((state) => state.auth);

    const socket = getSocket();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const params = useParams();
    const chatId = params.chatId;
    const deleteMenuAnchor = useRef(null);
    const { isMobileMenu } = useSelector((state) => state.misc);
    const { newMessagesAlert } = useSelector((state) => state.chat);

    const [onlineUsers, setOnlineUsers] = useState(null);

    const { isLoading, data, isError, error, refetch } = useMyChatsQuery("");

    useErrors([{ isError, error }]);

    useEffect(() => {
      getOrSaveFromLocalStorage({
        key: "NEW_MESSAGE_ALERT",
        value: newMessagesAlert,
      });
    }, [newMessagesAlert]);

    const handleDeleteChat = (e, _id, groupChat) => {
      dispatch(setIsDeleteMenu(true));
      dispatch(setSelectedDeleteChat({ chatId: _id, groupChat: groupChat }));
      deleteMenuAnchor.current = e.currentTarget;
    };

    const handleMobile = () => {
      dispatch(setIsMobileMenu(true));
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

    const onlineUsersListener = useCallback(
      (data) => {
        setOnlineUsers(data);
      },
      [dispatch]
    );

    const eventHandler = {
      NEW_MESSAGE_ALERT: newMessageAlertListener,
      NEW_REQUEST: newRequestAlertListener,
      REFETCH_CHATS: refetchListener,
      ONLINE_USERS: onlineUsersListener,
    };

    useSocketsEvents(socket, eventHandler);

    return (
      <>
        <Title />
        <Header />

        {/* Mobile Drawer for chat list */}
        {isLoading ? (
          <Skeleton />
        ) : (
          <Drawer open={isMobileMenu} onClose={handleMobileClose}>
            <ChatList
              w="70vw"
              chats={data?.chats}
              chatId={chatId}
              handleDeleteChat={handleDeleteChat}
              newMessagesAlert={newMessagesAlert}
              onlineUsers={onlineUsers}
            />
          </Drawer>
        )}

        {/* Main Grid Layout */}
        <Grid container sx={{ minHeight: "calc(100vh - 4rem)" }}>
          {/* Chat List - Sidebar for Small and Larger Screens */}
          <Grid
            item
            sm={4}
            md={3}
            sx={{ display: { xs: "none", sm: "block" }, height: "100%" }}
          >
            {isLoading ? (
              <Skeleton />
            ) : (
              <ChatList
                chats={data?.chats}
                chatId={chatId}
                handleDeleteChat={handleDeleteChat}
                newMessagesAlert={newMessagesAlert}
                onlineUsers={onlineUsers}
              />
            )}
          </Grid>

          <Grid
            item
            xs={12}
            sm={8}
            lg={6}
            sx={{
              height: "100%",
              overflowY: "auto",
            }}
          >
            <WrappedComponent {...props} chatId={chatId} />
          </Grid>

          {/* Profile Section */}
          <Grid
            item
            md={4}
            lg={3}
            height={"109vh"}
            sx={{
              display: { xs: "none", md: "block" },
              padding: "2rem",
              bgcolor: "rgba(0, 0, 0, 0.85)",
              height: "100%",
              overflowY: "auto",
            }}
          >
            <Profile user={user} />
          </Grid>
        </Grid>

        <DeleteChatMenu
          dispatch={dispatch}
          deleteOptionAnchor={deleteMenuAnchor}
        />
      </>
    );
  };
};

export default AppLayout;
