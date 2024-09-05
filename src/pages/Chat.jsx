import {
  AttachFile as AttachFileIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import { IconButton, Skeleton, Stack } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import FileMenu from "../components/dialogs/FileMenu";
import AppLayout from "../components/layout/AppLayout";
import MessageComponent from "../components/shared/MessageComponent";
import { InputBox } from "../components/styles/StyledComponent";
import { grayColor, orange } from "../constants/color";
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

const Chat = ({ chatId }) => {
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

  const chatDetails = useGetChatDetailsQuery({ chatId, skip: !chatId });
  const oldMessagesChunk = useGetChatMessagesQuery({
    chatId,
    page,
    skip: !chatId,
  });

  const { data: oldMessages, setData: setOldMessages } = useInfiniteScrollTop(
    containerRef,
    oldMessagesChunk.data?.totalPages,
    page,
    setPage,
    oldMessagesChunk.data?.messages
  );

  const members = chatDetails?.data?.chat?.members;

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
  };

  useEffect(() => {
    socket.emit("CHAT_JOINED", { userId: user._id, members });
    dispatch(removeNewMessagesAlert({ chatId }));

    return () => {
      setMessages([]);
      setMessage("");
      setOldMessages([]);
      setPage(1);
      socket.emit("CHAT_LEAVED", { userId: user._id, members });
    };
  }, [chatId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
    }, [2000]);
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
      content: data.message,
      sender: {
        _id: "jhgsdjhsbs",
        name: "Admin",
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, messageForAlert]);
  }, []);

  const eventHandler = {
    NEW_MESSAGE: newMessagesListener,
    START_TYPING: startTypingListener,
    STOP_TYPING: stopTypingListener,
    ALERT: alertListener,
  };

  useSocketsEvents(socket, eventHandler);

  useErrors(errors);

  const allMessages = [...oldMessages, ...messages];

  return chatDetails.isLoading ? (
    <Skeleton />
  ) : (
    <>
      <Stack
        className="custom-scrollbar"
        ref={containerRef}
        boxSizing={"border-box"}
        padding={"1rem"}
        spacing={"1rem"}
        bgcolor={grayColor}
        height={"calc(100vh - 80px)"}
        sx={{
          overflowX: "hidden",
          overflowY: "auto",
          backgroundColor: grayColor,
        }}
      >
        {allMessages?.map((message) => (
          <MessageComponent key={message._id} message={message} user={user} />
        ))}
        {userTyping && <TypingLoader />}
        <div ref={bottomRef} />
      </Stack>

      <form style={{ height: "80px", width: "100%" }} onSubmit={submitHandler}>
        <Stack
          direction={"row"}
          padding={"0.8rem 1rem"}
          alignItems={"center"}
          justifyContent={"space-between"}
          sx={{
            backgroundColor: "#f8f8f8",
            marginTop: "10px",
          }}
        >
          {/* Attach Icon */}
          <IconButton
            sx={{
              rotate: "2deg",
              padding: "0.5rem",
              backgroundColor: "#ececec",
              borderRadius: "50%",
              "&:hover": {
                backgroundColor: "#d4d4d4",
              },
            }}
            onClick={handleFileOpen}
          >
            <AttachFileIcon />
          </IconButton>

          {/* InputBox */}
          <InputBox
            placeholder="Type your message..."
            value={message}
            onChange={messageChangeHandler}
            sx={{
              fontSize: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              flexGrow: 1,
              padding: "0.8rem 1.5rem",
              marginLeft: "1rem",
              marginRight: "1rem",
              border: "1px solid #ddd",
            }}
          />

          {/* Send Button */}
          <IconButton
            type="submit"
            sx={{
              backgroundColor: orange,
              color: "white",
              padding: "0.8rem",
              borderRadius: "50%",
              "&:hover": {
                bgcolor: "error.dark",
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </form>

      <FileMenu anchorE1={fileMenuAnchor} chatId={chatId} />
    </>
  );
};

export default AppLayout()(Chat);
