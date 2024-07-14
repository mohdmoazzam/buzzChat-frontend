import { Box, Stack, Typography } from '@mui/material';
import { motion } from "framer-motion";
import React, { memo } from 'react';
import { Link } from '../styles/StyledComponent';
import AvatarCard from './AvatarCard';


const ChatItem = ({ avatar = [], name, _id, groupChat = false, sameSender, isOnline, newMessageAlert, index = 0, handleDeleteChat }) => {

  return (
    <Link
      sx={{ padding: "0" }}
      to={`/chat/${_id}`} onContextMenu={(e) => handleDeleteChat(e, _id, groupChat)}>
      <motion.div
        initial={{ opacity: 0, y: "-100%" }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        style={{
          display: "flex", alignItems: "center", padding: "1rem", backgroundColor: sameSender ? "black" : "unset",
          gap: "1rem",
          position: "relative",
          color: sameSender ? "white" : "unset"
        }}
      >
        <AvatarCard avatar={avatar} />
        <Stack>
          <Typography>{name}</Typography>
          {
            newMessageAlert && (
              <Typography>{newMessageAlert.count} New Message</Typography>
            )
          }
        </Stack>
        {
          isOnline && (
            <>
              <Box sx={{
                width: "10px",
                height: "10px",
                backgroundColor: "green",
                borderRadius: "50%",
                display: "inline-block",
                marginRight: "5px"
              }} />
            </>
          )
        }
      </motion.div>
    </Link>
  )
}

export default memo(ChatItem);