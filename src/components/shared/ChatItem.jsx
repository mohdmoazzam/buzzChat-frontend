import {
  AudiotrackRounded as AudioIcon,
  BlockRounded as BlockIcon,
  DescriptionRounded as FileIcon,
  ImageRounded as ImageIcon,
  VideocamRounded as VideoIcon,
} from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { orange } from '../../constants/color';
import { accentSoft } from '../../constants/theme';
import { fileFormat, formatChatTime } from '../../lib/features';
import AvatarCard from './AvatarCard';

const ATTACHMENT_LABELS = {
  image: { label: "Photo", Icon: ImageIcon },
  video: { label: "Video", Icon: VideoIcon },
  audio: { label: "Audio", Icon: AudioIcon },
  file: { label: "File", Icon: FileIcon },
};

// "You: hi", "Aisha: hi" (groups), "📷 Photo", or a group/online hint when empty
const Preview = ({ lastMessage, groupChat, isOnline, unread, myId }) => {
  if (!lastMessage) {
    return groupChat ? "Group chat" : isOnline ? "Online" : "No messages yet";
  }

  const mine = !!myId && lastMessage.sender?.id === myId;
  if (lastMessage.deleted_at) {
    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0, fontStyle: "italic" }}>
        <BlockIcon sx={{ fontSize: 15, flexShrink: 0, color: "text.disabled" }} />
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {mine ? "You deleted this message" : "This message was deleted"}
        </Box>
      </Box>
    );
  }

  const prefix = mine ? "You: " : groupChat ? `${lastMessage.sender?.first_name ?? "Deleted user"}: ` : "";
  const attachments = lastMessage.attachments ?? [];

  if (!lastMessage.content && attachments.length) {
    const { label, Icon } = ATTACHMENT_LABELS[fileFormat(attachments[0].url)] ?? ATTACHMENT_LABELS.file;
    const text = attachments.length > 1 ? `${attachments.length} ${label === "Audio" ? "audio files" : `${label.toLowerCase()}s`}` : label;
    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
        {prefix}
        <Icon sx={{ fontSize: 16, flexShrink: 0, color: unread ? "text.primary" : "text.disabled" }} />
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{text}</Box>
      </Box>
    );
  }

  return `${prefix}${lastMessage.content}`;
};

const ChatItem = ({
  avatar = [], name, id, groupChat = false, sameSender, isOnline, unreadCount = 0, lastMessage,
  handleDeleteChat, onSelect,
}) => {
  const myId = useSelector((state) => state.auth.user?.id);
  const unread = unreadCount || 0;
  const time = formatChatTime(lastMessage?.created_at);

  return (
    <Box
      component={Link}
      to={`/chat/${id}`}
      onClick={onSelect}
      onContextMenu={(e) => handleDeleteChat(e, id, groupChat)}
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

      <Stack sx={{ minWidth: 0, flex: 1 }} spacing={0.25}>
        {/* Name + time */}
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography noWrap fontWeight={unread ? 700 : 600} fontSize="0.95rem" sx={{ flex: 1, minWidth: 0 }}>
            {name}
          </Typography>
          {time && (
            <Typography
              variant="caption"
              sx={{ flexShrink: 0, color: unread ? orange : "text.secondary", fontWeight: unread ? 600 : 400 }}
            >
              {time}
            </Typography>
          )}
        </Stack>

        {/* Preview + unread badge */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            noWrap
            variant="body2"
            component="div"
            sx={{ flex: 1, minWidth: 0, color: unread ? "text.primary" : "text.secondary", fontWeight: unread ? 600 : 400 }}
          >
            <Preview lastMessage={lastMessage} groupChat={groupChat} isOnline={isOnline} unread={unread} myId={myId} />
          </Typography>
          {unread > 0 && (
            <Box sx={{
              minWidth: 20,
              height: 20,
              px: 0.75,
              borderRadius: "10px",
              bgcolor: orange,
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {unread > 99 ? "99+" : unread}
            </Box>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}

export default memo(ChatItem);
