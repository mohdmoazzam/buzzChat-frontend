import {
  CloseRounded as CloseIcon,
  DeleteOutlineRounded as DeleteIcon,
  ExitToAppRounded as LeaveIcon,
  SearchRounded as SearchIcon,
  SettingsOutlined as ManageIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import moment from "moment";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { transformImage } from "../../lib/features";
import { useDeleteChatMutation, useGetChatDetailsQuery, useLeaveGroupMutation } from "../../redux/api/api";
import ConfirmDeleteDialog from "../dialogs/ConfirmDeleteDialog";
import AvatarCard from "../shared/AvatarCard";

// Same rule as the server (GROUP_MIN_MEMBERS): leaving can't drop a group below this
const MIN_MEMBERS = 3;
// Show the member search once the list gets long
const SEARCH_FROM = 7;

const nameOf = (member) => [member.first_name, member.last_name].filter(Boolean).join(" ");

/**
 * Leave / delete for a group, shared by the header menu and the info panel.
 * `chat` is the chat details (creator_id, members as ids); returns the actions and their confirm dialogs.
 */
export const useGroupActions = ({ chatId, chat, currentUserId, profiles }) => {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null); // "leave" | "delete" | null
  const [leaveGroup, { isLoading: isLeaving }] = useLeaveGroupMutation();
  const [deleteChat, { isLoading: isDeleting }] = useDeleteChatMutation();

  const isAdmin = !!chat && chat.creator_id === currentUserId;
  const memberCount = chat?.members?.length ?? 0;
  const canLeave = memberCount - 1 >= MIN_MEMBERS;
  const leaveBlockedReason = canLeave
    ? null
    : `Groups need at least ${MIN_MEMBERS} members, so you can't leave this one.${isAdmin ? " You can delete it instead." : ""}`;
  // The server hands admin to the longest-standing member, who comes first in its member list
  const nextAdmin = profiles?.find((member) => member.id !== currentUserId);

  const run = async (mutate) => {
    const res = await mutate(chatId);
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    setConfirm(null);
    navigate("/");
  };

  const requestLeave = () => {
    if (!canLeave) return toast.error(leaveBlockedReason, { id: "leave-blocked" });
    setConfirm("leave");
  };

  const dialogs = (
    <>
      <ConfirmDeleteDialog
        open={confirm === "leave"}
        handleClose={() => setConfirm(null)}
        deleteHandler={() => run(leaveGroup)}
        isLoading={isLeaving}
        title={`Leave ${chat?.name ?? "group"}?`}
        message={
          isAdmin && nextAdmin
            ? `You'll stop getting its messages. ${nameOf(nextAdmin)} will become the admin.`
            : "You'll stop getting its messages. The admin can add you back later."
        }
        confirmLabel="Leave"
      />
      <ConfirmDeleteDialog
        open={confirm === "delete"}
        handleClose={() => setConfirm(null)}
        deleteHandler={() => run(deleteChat)}
        isLoading={isDeleting}
      />
    </>
  );

  return { isAdmin, canLeave, leaveBlockedReason, requestLeave, requestDelete: () => setConfirm("delete"), dialogs };
};

const OnlineAvatar = ({ src, online }) => (
  <Badge
    overlap="circular"
    variant="dot"
    invisible={!online}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    sx={{ "& .MuiBadge-badge": { bgcolor: "#16a34a", border: "2px solid #fff", width: 12, height: 12, borderRadius: "50%" } }}
  >
    <Avatar src={transformImage(src)} />
  </Badge>
);

const SectionTitle = ({ children }) => (
  <Typography variant="overline" color="text.secondary" sx={{ px: 3, pt: 2, display: "block", lineHeight: 2 }}>
    {children}
  </Typography>
);

// Right-hand panel (full screen on phones): who's in the group, and leaving it
const GroupInfoPanel = ({ open, onClose, chatId, chat, currentUserId, onlineUsers = [], actions, profiles, isLoading }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const members = useMemo(() => {
    const creatorId = chat?.creator_id;
    // You, then the admin, then whoever is online, then everyone else by name
    const rank = (member) =>
      member.id === currentUserId ? 0 : member.id === creatorId ? 1 : onlineUsers.includes(member.id) ? 2 : 3;
    const term = search.trim().toLowerCase();
    return [...(profiles ?? [])]
      .filter((member) => !term || nameOf(member).toLowerCase().includes(term) || member.username?.toLowerCase().includes(term))
      .sort((a, b) => rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b)));
  }, [profiles, search, chat?.creator_id, currentUserId, onlineUsers]);

  const total = profiles?.length ?? chat?.members?.length ?? 0;
  const onlineCount = (profiles ?? []).filter((member) => member.id !== currentUserId && onlineUsers.includes(member.id)).length;

  const goManage = () => {
    onClose();
    navigate(`/settings/groups?group=${chatId}`);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 380 }, display: "flex", flexDirection: "column" } }}
    >
      {/* Top bar */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <IconButton onClick={onClose} aria-label="Close group info">
          <CloseIcon />
        </IconButton>
        <Typography fontWeight={700}>Group info</Typography>
      </Stack>

      <Box className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
        {/* Hero */}
        <Stack alignItems="center" spacing={0.5} sx={{ px: 3, pt: 3, pb: 2, textAlign: "center" }}>
          <AvatarCard avatar={chat?.avatar} size={96} />
          <Typography variant="h6" fontWeight={700} sx={{ pt: 1.5, wordBreak: "break-word" }}>
            {chat?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Group · {total} members{onlineCount ? ` · ${onlineCount} online` : ""}
          </Typography>
        </Stack>

        {(chat?.description || chat?.created_at) && (
          <>
            <Divider />
            <Box sx={{ px: 3, py: 2 }}>
              {chat?.description && (
                <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", mb: 0.5 }}>{chat.description}</Typography>
              )}
              {chat?.created_at && (
                <Typography variant="caption" color="text.secondary">
                  Created {moment(chat.created_at).format("D MMM YYYY")}
                </Typography>
              )}
            </Box>
          </>
        )}

        {actions.isAdmin && (
          <>
            <Divider />
            <List disablePadding>
              <ListItemButton onClick={goManage} sx={{ px: 3 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <ManageIcon />
                </ListItemIcon>
                <ListItemText primary="Manage group" secondary="Edit name and photo, add or remove members" />
              </ListItemButton>
            </List>
          </>
        )}

        {/* Members */}
        <Divider />
        <SectionTitle>{total} members</SectionTitle>
        {total >= SEARCH_FROM && (
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search members"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: "999px" },
              }}
            />
          </Box>
        )}
        <List dense disablePadding>
          {isLoading || !profiles
            ? [0, 1, 2].map((i) => (
                <ListItem key={i} sx={{ px: 3 }}>
                  <ListItemAvatar><Skeleton variant="circular" width={40} height={40} /></ListItemAvatar>
                  <ListItemText primary={<Skeleton width="50%" />} secondary={<Skeleton width="30%" />} />
                </ListItem>
              ))
            : members.map((member) => {
                const isMe = member.id === currentUserId;
                const online = isMe || onlineUsers.includes(member.id);
                return (
                  <ListItem
                    key={member.id}
                    sx={{ px: 3 }}
                    secondaryAction={
                      member.id === chat?.creator_id ? (
                        <Chip label="Admin" size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                      ) : null
                    }
                  >
                    <ListItemAvatar>
                      <OnlineAvatar src={member.avatar?.url} online={online} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={isMe ? "You" : nameOf(member)}
                      secondary={`@${member.username}${!isMe && online ? " · online" : ""}`}
                      primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                );
              })}
          {profiles && !members.length && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 3, py: 1 }}>
              No members match “{search}”
            </Typography>
          )}
        </List>

        {/* Leaving: explained up front when it isn't allowed, instead of failing on click */}
        <Divider sx={{ mt: 1 }} />
        <List disablePadding>
          <ListItemButton
            onClick={actions.requestLeave}
            disabled={!actions.canLeave}
            sx={{ px: 3, color: "error.main", "&.Mui-disabled": { opacity: 1 } }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: actions.canLeave ? "inherit" : "text.disabled" }}>
              <LeaveIcon />
            </ListItemIcon>
            <ListItemText
              primary="Leave group"
              secondary={actions.leaveBlockedReason}
              primaryTypographyProps={{ fontWeight: 600, color: actions.canLeave ? "error.main" : "text.disabled" }}
            />
          </ListItemButton>
          {actions.isAdmin && (
            <ListItemButton onClick={actions.requestDelete} sx={{ px: 3, color: "error.main" }}>
              <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                <DeleteIcon />
              </ListItemIcon>
              <ListItemText
                primary="Delete group"
                secondary="Removes the group and its messages for everyone"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </ListItemButton>
          )}
        </List>
      </Box>
    </Drawer>
  );
};

/** Member profiles for the panel and the leave confirmation, fetched only once they're needed. */
export const useGroupProfiles = (chatId, needed) => {
  const details = useGetChatDetailsQuery({ chatId, populate: true }, { skip: !needed || !chatId });
  return { profiles: details.data?.chat?.members, isLoading: details.isLoading };
};

export default GroupInfoPanel;
