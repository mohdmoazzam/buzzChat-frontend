import {
  CloseRounded as CloseIcon,
  DeleteOutlineRounded as DeleteIcon,
  ExitToAppRounded as LeaveIcon,
  SettingsOutlined as ManageIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { transformImage } from "../../lib/features";
import { useDeleteChatMutation, useGroupMembersQuery, useLeaveGroupMutation } from "../../redux/api/api";
import ConfirmDeleteDialog from "../dialogs/ConfirmDeleteDialog";
import AvatarCard from "../shared/AvatarCard";

// Same rule as the server (GROUP_MIN_MEMBERS): leaving can't drop a group below this
const MIN_MEMBERS = 3;

const nameOf = (member) => [member.first_name, member.last_name].filter(Boolean).join(" ");

/** Members a page at a time (GET /chat/:id/members), only while `needed`. Starts over each time. */
const useGroupMembers = (chatId, needed) => {
  const [cursor, setCursor] = useState(null);
  useEffect(() => {
    if (!needed) setCursor(null);
  }, [needed, chatId]);

  const { data, isLoading, isFetching } = useGroupMembersQuery({ chatId, cursor }, { skip: !needed || !chatId });
  const pagination = data?.pagination;
  return {
    members: data?.members,
    total: pagination?.total,
    hasMore: !!pagination?.has_more,
    isLoading,
    isLoadingMore: isFetching && !!cursor,
    loadMore: () => pagination?.next_cursor && setCursor(pagination.next_cursor),
  };
};

/**
 * Leave / delete for a group, shared by the header menu and the info panel, plus the members list
 * (loaded while the panel is open, or for the leave confirmation). `chat` is the chat details.
 */
export const useGroupActions = ({ chatId, chat, currentUserId, panelOpen }) => {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null); // "leave" | "delete" | null
  const [leaveGroup, { isLoading: isLeaving }] = useLeaveGroupMutation();
  const [deleteChat, { isLoading: isDeleting }] = useDeleteChatMutation();
  const members = useGroupMembers(chatId, panelOpen || confirm === "leave");

  const isAdmin = !!chat && chat.creator_id === currentUserId;
  const canLeave = (chat?.members?.length ?? 0) - 1 >= MIN_MEMBERS;
  const leaveBlockedReason = canLeave
    ? null
    : `A group needs at least ${MIN_MEMBERS} members.${isAdmin ? " You can delete it instead." : ""}`;
  // Admin passes to the longest-standing member: the first one in join order who isn't you
  const nextAdmin = members.members?.find((member) => member.id !== currentUserId);

  const run = async (mutate) => {
    const res = await mutate(chatId);
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    setConfirm(null);
    navigate("/");
  };

  const requestLeave = () => {
    if (!canLeave) return toast.error(`You can't leave: ${leaveBlockedReason}`, { id: "leave-blocked" });
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

  return { isAdmin, canLeave, leaveBlockedReason, requestLeave, requestDelete: () => setConfirm("delete"), dialogs, members };
};

const MemberRow = ({ member, isMe, online }) => (
  <ListItem sx={{ px: 3 }}>
    <ListItemAvatar>
      <Badge
        overlap="circular"
        variant="dot"
        invisible={!online}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ "& .MuiBadge-badge": { bgcolor: "#16a34a", border: "2px solid #fff", width: 12, height: 12, borderRadius: "50%" } }}
      >
        <Avatar src={transformImage(member.avatar?.url)} />
      </Badge>
    </ListItemAvatar>
    <ListItemText
      primary={isMe ? "You" : nameOf(member)}
      secondary={`@${member.username}`}
      primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
      secondaryTypographyProps={{ noWrap: true }}
    />
    {member.is_admin && (
      <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, ml: 1, flexShrink: 0 }}>
        Admin
      </Typography>
    )}
  </ListItem>
);

const ActionRow = ({ icon, label, hint, onClick, danger, disabled }) => (
  <ListItemButton onClick={onClick} disabled={disabled} sx={{ px: 3, "&.Mui-disabled": { opacity: 1 } }}>
    <ListItemIcon sx={{ minWidth: 40, color: disabled ? "text.disabled" : danger ? "error.main" : "text.secondary" }}>
      {icon}
    </ListItemIcon>
    <ListItemText
      primary={label}
      secondary={hint}
      primaryTypographyProps={{ fontWeight: 600, color: disabled ? "text.disabled" : danger ? "error.main" : "text.primary" }}
    />
  </ListItemButton>
);

// Right-hand panel (full screen on phones): the group, its members, and leaving it
const GroupInfoPanel = ({ open, onClose, chatId, chat, currentUserId, onlineUsers = [], actions }) => {
  const navigate = useNavigate();
  const { members, total, hasMore, isLoading, isLoadingMore, loadMore } = actions.members;
  const count = total ?? chat?.members?.length ?? 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 360 }, display: "flex", flexDirection: "column" } }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <IconButton onClick={onClose} aria-label="Close group info">
          <CloseIcon />
        </IconButton>
        <Typography fontWeight={700}>Group info</Typography>
      </Stack>

      <Box className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto" }}>
        <Stack alignItems="center" spacing={0.5} sx={{ px: 3, py: 3, textAlign: "center" }}>
          <AvatarCard avatar={chat?.avatar} size={88} />
          <Typography variant="h6" fontWeight={700} sx={{ pt: 1, wordBreak: "break-word" }}>
            {chat?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {count} {count === 1 ? "member" : "members"}
          </Typography>
          {chat?.description && (
            <Typography variant="body2" sx={{ pt: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {chat.description}
            </Typography>
          )}
        </Stack>

        {actions.isAdmin && (
          <>
            <Divider />
            <List disablePadding>
              <ActionRow
                icon={<ManageIcon />}
                label="Manage group"
                onClick={() => {
                  onClose();
                  navigate(`/settings/groups?group=${chatId}`);
                }}
              />
            </List>
          </>
        )}

        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ px: 3, pt: 2, pb: 0.5 }}>
          Members
        </Typography>
        <List dense disablePadding>
          {isLoading || !members
            ? [0, 1, 2].map((i) => (
                <ListItem key={i} sx={{ px: 3 }}>
                  <ListItemAvatar><Skeleton variant="circular" width={40} height={40} /></ListItemAvatar>
                  <ListItemText primary={<Skeleton width="50%" />} secondary={<Skeleton width="30%" />} />
                </ListItem>
              ))
            : members.map((member) => {
                const isMe = member.id === currentUserId;
                return <MemberRow key={member.id} member={member} isMe={isMe} online={isMe || onlineUsers.includes(member.id)} />;
              })}
        </List>
        {hasMore && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Button fullWidth onClick={loadMore} disabled={isLoadingMore} sx={{ borderRadius: "999px" }}>
              {isLoadingMore ? <CircularProgress size={18} /> : `Show more (${count - members.length})`}
            </Button>
          </Box>
        )}

        <Divider sx={{ mt: 1 }} />
        <List disablePadding sx={{ pb: 2 }}>
          <ActionRow
            icon={<LeaveIcon />}
            label="Leave group"
            hint={actions.leaveBlockedReason}
            onClick={actions.requestLeave}
            disabled={!actions.canLeave}
            danger
          />
          {actions.isAdmin && (
            <ActionRow icon={<DeleteIcon />} label="Delete group" onClick={actions.requestDelete} danger />
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default GroupInfoPanel;
