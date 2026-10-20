import { Box, Stack, Typography } from '@mui/material';
import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { orange } from '../../constants/color';
import { accentSoft } from '../../constants/theme';
import AvatarCard from './AvatarCard';

const ChatItem = ({ avatar = [], name, _id, groupChat = false, sameSender, isOnline, newMessageAlert, handleDeleteChat, onSelect }) => {
  const unread = newMessageAlert?.count || 0;

  return (
    <Box
      component={Link}
      to={`/chat/${_id}`}
      onClick={onSelect}
      onContextMenu={(e) => handleDeleteChat(e, _id, groupChat)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        mx: 1,
        borderRadius: "12px",
        textDecoration: "none",
        color: "text.primary",
        bgcolor: sameSender ? accentSoft : "transparent",
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: sameSender ? accentSoft : "#f4f4f6" },
      }}
    >
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <AvatarCard avatar={avatar} />
        {isOnline && (
          <Box sx={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: 12,
            height: 12,
            bgcolor: "#22c55e",
            borderRadius: "50%",
            border: "2px solid #fff",
          }} />
        )}
      </Box>

      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap fontWeight={unread ? 700 : 600} fontSize="0.95rem">{name}</Typography>
        <Typography noWrap variant="body2" color={unread ? "text.primary" : "text.secondary"} fontWeight={unread ? 600 : 400}>
          {unread
            ? `${unread} new message${unread > 1 ? "s" : ""}`
            : groupChat ? "Group chat" : isOnline ? "Online" : "Tap to open chat"}
        </Typography>
      </Stack>

      {unread > 0 && (
        <Box sx={{
          minWidth: 22,
          height: 22,
          px: 0.75,
          borderRadius: "11px",
          bgcolor: orange,
          color: "#fff",
          fontSize: "0.75rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {unread > 99 ? "99+" : unread}
        </Box>
      )}
    </Box>
  )
}

export default memo(ChatItem);
