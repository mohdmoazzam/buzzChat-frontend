import { Stack } from '@mui/material';
import React from 'react';
import ChatItem from "../shared/ChatItem";

const ChatList = ({ w = "100%", chats = [], chatId, onlineUsers = [], newMessagesAlert = [], handleDeleteChat }) => {
  return (

    <Stack width={w} direction={"column"} overflow={"auto"} height={"100%"}>
      {

        chats?.map((chat, index) => {

          const { _id, name, groupChat, avatar, members } = chat;
  
          const newMessageAlert = newMessagesAlert?.find(({ chatId }) => chatId === _id);

          const isOnline = members?.some((member) => onlineUsers?.includes(member));

          return <ChatItem
            key={index}
            newMessageAlert={newMessageAlert}
            isOnline={isOnline}
            avatar={avatar}
            name={name}
            _id={_id}
            groupChat={groupChat}
            sameSender={chatId == _id}
            handleDeleteChat={handleDeleteChat}
            index={index}
          />
        })
      }
    </Stack>
  )
}

export default ChatList;