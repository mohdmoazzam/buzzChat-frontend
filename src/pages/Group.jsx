import {
  ArrowBack as ArrowBackIcon,
  CameraAltOutlined as CameraIcon,
  ChatBubbleOutlineRounded as ChatIcon,
  CheckRounded as CheckIcon,
  ChevronRightRounded as ChevronIcon,
  CloseRounded as CloseIcon,
  DeleteOutlineRounded as DeleteIcon,
  EditOutlined as EditIcon,
  GroupAddOutlined as GroupAddIcon,
  GroupsOutlined as GroupsIcon,
  PersonAddAlt1Outlined as PersonAddIcon,
  PersonRemoveOutlined as PersonRemoveIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Backdrop,
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AddMemberDialog from '../components/dialogs/AddMemberDialog';
import ConfirmDeleteDialog from '../components/dialogs/ConfirmDeleteDialog';
import AppLayout from '../components/layout/AppLayout';
import AvatarCard from '../components/shared/AvatarCard';
import Title from '../components/shared/Title';
import { VisuallyHiddenInput } from '../components/styles/StyledComponent';
import { orange } from '../constants/color';
import { useErrors } from '../hooks/hook';
import { fullName, transformImage } from '../lib/features';
import {
  useDeleteChatMutation,
  useGetChatDetailsQuery,
  useMyGroupsQuery,
  useRemoveGroupMemberMutation,
  useRenameGroupMutation,
  useUploadAssetsMutation,
} from '../redux/api/api';
import { setIsAddMember, setIsNewGroup } from '../redux/reducers/misc';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;
const MIN_MEMBERS = 3;
const MAX_MEMBERS = 15;

const inputSx = {
  bgcolor: "#fff",
  borderRadius: "12px",
  px: 1.5,
  py: 1,
  border: "1px solid",
  borderColor: orange,
  boxShadow: "0 0 0 4px rgba(234,112,112,0.15)",
};

const Group = () => {
  const chatId = useSearchParams()[0].get("group");
  return chatId ? <GroupDetails chatId={chatId} /> : <GroupsList />;
};

/* ---------------- List of groups ---------------- */

const GroupsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const myGroups = useMyGroupsQuery("");
  useErrors([{ isError: myGroups.isError, error: myGroups.error }]);

  const groups = myGroups.data?.groups ?? [];

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Groups · BuzzChat" />
      <Box sx={{ px: { xs: 2.5, sm: 6 }, py: { xs: 3, sm: 5 } }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700}>Groups</Typography>
            <Typography variant="body2" color="text.secondary">Groups you created and manage</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<GroupAddIcon />}
            onClick={() => dispatch(setIsNewGroup(true))}
            sx={{ borderRadius: "999px", px: 2.5, flexShrink: 0 }}
          >
            New group
          </Button>
        </Stack>

        {myGroups.isLoading ? (
          <Stack spacing={1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={2} sx={{ py: 1.5 }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box flex={1}><Skeleton width="40%" /><Skeleton width="25%" /></Box>
              </Stack>
            ))}
          </Stack>
        ) : groups.length === 0 ? (
          <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ py: 8 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GroupsIcon sx={{ fontSize: 34, color: "text.disabled" }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>No groups yet</Typography>
            <Typography color="text.secondary" maxWidth={340}>
              Create a group to chat with several friends at once. Groups you create will show up here.
            </Typography>
          </Stack>
        ) : (
          <Stack divider={<Divider sx={{ ml: "72px" }} />}>
            {groups.map((group) => (
              <Box
                key={group.id}
                component="button"
                type="button"
                onClick={() => navigate(`/settings/groups?group=${group.id}`)}
                sx={{
                  all: "unset",
                  boxSizing: "border-box",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 1,
                  py: 1.5,
                  borderRadius: "12px",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#f8f8fa" },
                  "&:focus-visible": { outline: `2px solid ${orange}`, outlineOffset: -2 },
                }}
              >
                <AvatarCard avatar={group.avatar} size={48} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap>{group.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {group.description || `${group.member_count ?? ""} members`}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                  {group.member_count} members
                </Typography>
                <ChevronIcon sx={{ color: "text.disabled" }} />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

/* ---------------- Single group ---------------- */

const GroupDetails = ({ chatId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isAddMember } = useSelector((state) => state.misc);

  const groupDetails = useGetChatDetailsQuery({ chatId, populate: true }, { skip: !chatId });
  const [updateGroup, { isLoading: isSaving }] = useRenameGroupMutation();
  const [uploadAssets, { isLoading: isUploading }] = useUploadAssetsMutation();
  const isUpdating = isSaving || isUploading;
  const [removeMember, { isLoading: isRemoving }] = useRemoveGroupMemberMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteChatMutation();

  useErrors([{ isError: groupDetails.isError, error: groupDetails.error }]);

  const chat = groupDetails.data?.chat;
  const members = chat?.members ?? [];
  const isCreator = !!user?.id && chat?.creator_id === user.id;

  const [editing, setEditing] = useState(null); // "name" | "description" | null
  const [draft, setDraft] = useState("");
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEditing(null);
  }, [chatId]);

  useEffect(() => {
    if (groupDetails.isError) navigate("/settings/groups");
  }, [groupDetails.isError, navigate]);

  const save = async (fields, successMessage) => {
    const response = await updateGroup({ chatId, ...fields });
    if (response.data) {
      toast.success(successMessage);
      setEditing(null);
    } else {
      toast.error(response.error?.data?.message || "Couldn't update group");
    }
  };

  const startEdit = (field) => {
    setDraft(field === "name" ? chat?.name ?? "" : chat?.description ?? "");
    setEditing(field);
  };

  const saveEdit = () => {
    if (editing === "name") {
      if (!draft.trim()) return toast.error("Group name can't be empty");
      if (draft.trim() === chat?.name) return setEditing(null);
      save({ name: draft.trim() }, "Group name updated");
    } else {
      if (draft.trim() === (chat?.description ?? "")) return setEditing(null);
      save({ description: draft.trim() }, "Description updated");
    }
  };

  const avatarChangeHandler = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    uploadAssets([file]).then((uploaded) => {
      if (!uploaded.data) return toast.error(uploaded.error?.data?.message || "Couldn't upload the picture");
      save({ avatar_id: uploaded.data.assets[0].id }, "Group picture updated");
    });
  };

  const confirmRemove = async () => {
    const response = await removeMember({ chatId, userId: memberToRemove.id });
    if (response.data) toast.success(`${fullName(memberToRemove)} removed`);
    else toast.error(response.error?.data?.message || "Couldn't remove member");
    setMemberToRemove(null);
  };

  const confirmDeleteGroup = async () => {
    const response = await deleteGroup(chatId);
    if (response.data) {
      toast.success("Group deleted");
      setConfirmDelete(false);
      navigate("/settings/groups");
    } else {
      toast.error(response.error?.data?.message || "Couldn't delete group");
    }
  };

  if (groupDetails.isLoading || !chat) {
    return (
      <Box sx={{ height: "100%", bgcolor: "#fff", px: { xs: 2.5, sm: 6 }, py: 5 }}>
        <Stack alignItems="center" spacing={2}>
          <Skeleton variant="circular" width={104} height={104} />
          <Skeleton width={200} height={36} />
          <Skeleton width={280} />
        </Stack>
      </Box>
    );
  }

  const canRemove = members.length > MIN_MEMBERS;
  const isFull = members.length >= MAX_MEMBERS;

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title={`${chat.name} · BuzzChat`} />

      {/* Top bar */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: { xs: 1.5, sm: 5 }, pt: 2 }}>
        <IconButton onClick={() => navigate("/settings/groups")} aria-label="Back to groups">
          <ArrowBackIcon />
        </IconButton>
        <Typography fontWeight={600} color="text.secondary">Groups</Typography>
      </Stack>

      <Box sx={{ px: { xs: 2.5, sm: 6 }, pb: 6 }}>
        {/* Hero */}
        <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ pt: 2, pb: 4 }}>
          <Box
              component={isCreator ? "label" : "div"}
              aria-label={isCreator ? "Change group picture" : undefined}
              sx={{ position: "relative", borderRadius: "50%", cursor: isCreator ? "pointer" : "default", "&:hover .overlay": { opacity: isCreator ? 1 : 0 } }}
            >
              {chat.avatar ? (
                <Avatar src={transformImage(chat.avatar.url, 240)} sx={{ width: 104, height: 104 }} />
              ) : (
                <Avatar sx={{ width: 104, height: 104, bgcolor: "#f4f4f6", color: "text.disabled" }}>
                  <GroupsIcon sx={{ fontSize: 44 }} />
                </Avatar>
              )}
              {isCreator && (
                <>
                  <Box
                    className="overlay"
                    sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
                  >
                    <CameraIcon />
                  </Box>
                  <Box sx={{ position: "absolute", right: 2, bottom: 2, width: 30, height: 30, borderRadius: "50%", bgcolor: orange, color: "#fff", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CameraIcon sx={{ fontSize: 15 }} />
                  </Box>
                  <VisuallyHiddenInput type="file" accept="image/*" onChange={avatarChangeHandler} disabled={isUpdating} />
                </>
              )}
          </Box>

          {/* Name */}
          {editing === "name" ? (
            <InlineEditor
              value={draft}
              onChange={(v) => setDraft(v.slice(0, NAME_MAX))}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
              max={NAME_MAX}
              isSaving={isUpdating}
              placeholder="Group name"
            />
          ) : (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h5" fontWeight={700} sx={{ wordBreak: "break-word" }}>{chat.name}</Typography>
              {isCreator && (
                <IconButton size="small" onClick={() => startEdit("name")} aria-label="Edit group name" sx={{ color: "text.secondary" }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          )}

          {/* Description */}
          {editing === "description" ? (
            <InlineEditor
              value={draft}
              onChange={(v) => setDraft(v.slice(0, DESCRIPTION_MAX))}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
              max={DESCRIPTION_MAX}
              isSaving={isUpdating}
              multiline
              placeholder="What's this group about?"
            />
          ) : (
            <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ maxWidth: 520 }}>
              <Typography color={chat.description ? "text.secondary" : "text.disabled"} sx={{ wordBreak: "break-word" }}>
                {chat.description || (isCreator ? "Add a description" : "No description")}
              </Typography>
              {isCreator && (
                <IconButton size="small" onClick={() => startEdit("description")} aria-label="Edit description" sx={{ color: "text.secondary", mt: -0.25 }}>
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Stack>
          )}

          <Stack direction="row" spacing={1} alignItems="center" pt={0.5}>
            <Typography variant="body2" color="text.secondary">Group · {members.length} members</Typography>
          </Stack>

          <Button
            variant="outlined"
            startIcon={<ChatIcon />}
            onClick={() => navigate(`/chat/${chatId}`)}
            sx={{ borderRadius: "999px", px: 2.5, borderColor: "#e4e4e7", color: "text.primary", "&:hover": { borderColor: "#d4d4d8", bgcolor: "#fafafa" } }}
          >
            Open chat
          </Button>
        </Stack>

        <Divider />

        {/* Members */}
        <Box sx={{ py: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>Members</Typography>
              <Typography variant="body2" color="text.secondary">{members.length} of {MAX_MEMBERS}</Typography>
            </Box>
            {isCreator && (
              <Tooltip title={isFull ? `Groups can have at most ${MAX_MEMBERS} members` : ""}>
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => dispatch(setIsAddMember(true))}
                    disabled={isFull}
                    sx={{ borderRadius: "999px", px: 2 }}
                  >
                    Add people
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>

          <Stack divider={<Divider sx={{ ml: "60px" }} />}>
            {members.map((member) => {
              const isMe = member.id === user?.id;
              const isAdmin = member.id === chat.creator_id;
              return (
                <Stack key={member.id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 1.25 }}>
                  <Avatar src={transformImage(member.avatar?.url)} sx={{ width: 44, height: 44 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={600} noWrap>{isMe ? "You" : fullName(member)}</Typography>
                      {isAdmin && (
                        <Box component="span" sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#c74e4e", bgcolor: "rgba(234,112,112,0.12)", px: 0.75, py: 0.25, borderRadius: "6px" }}>
                          Admin
                        </Box>
                      )}
                    </Stack>
                    {member.username && (
                      <Typography variant="body2" color="text.secondary" noWrap>@{member.username}</Typography>
                    )}
                  </Box>
                  {isCreator && !isMe && (
                    <Tooltip title={canRemove ? `Remove ${fullName(member)}` : `Groups need at least ${MIN_MEMBERS} members`}>
                      <span>
                        <IconButton
                          onClick={() => setMemberToRemove(member)}
                          disabled={!canRemove}
                          aria-label={`Remove ${fullName(member)}`}
                          sx={{ color: "text.secondary", "&:hover": { color: "error.main", bgcolor: "rgba(211,47,47,0.06)" } }}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Box>

        {isCreator && (
          <>
            <Divider />

            {/* Danger zone */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
              sx={{ mt: 3, p: 2.5, borderRadius: "16px", border: "1px solid rgba(211,47,47,0.25)", bgcolor: "rgba(211,47,47,0.03)" }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700} color="error.main">Delete group</Typography>
                <Typography variant="body2" color="text.secondary">
                  Removes the group and all its messages for everyone. This can't be undone.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDelete(true)}
                sx={{ borderRadius: "999px", px: 2.5, flexShrink: 0 }}
              >
                Delete group
              </Button>
            </Stack>
          </>
        )}
      </Box>

      {isAddMember && (
        <Suspense fallback={<Backdrop open />}>
          <AddMemberDialog chatId={chatId} currentCount={members.length} />
        </Suspense>
      )}

      <ConfirmDeleteDialog
        open={!!memberToRemove}
        handleClose={() => setMemberToRemove(null)}
        deleteHandler={confirmRemove}
        title={`Remove ${memberToRemove ? fullName(memberToRemove) : "member"}?`}
        message="They'll be removed from the group and won't see new messages."
        confirmLabel="Remove"
        isLoading={isRemoving}
      />

      <ConfirmDeleteDialog
        open={confirmDelete}
        handleClose={() => setConfirmDelete(false)}
        deleteHandler={confirmDeleteGroup}
        title={`Delete "${chat.name}"?`}
        isLoading={isDeleting}
      />
    </Box>
  );
};

const InlineEditor = ({ value, onChange, onSave, onCancel, max, isSaving, multiline = false, placeholder }) => (
  <Box sx={{ width: "100%", maxWidth: 480 }}>
    <InputBase
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && !(multiline && e.shiftKey)) { e.preventDefault(); onSave(); }
      }}
      placeholder={placeholder}
      multiline={multiline}
      minRows={multiline ? 2 : 1}
      maxRows={5}
      fullWidth
      sx={{ ...inputSx, textAlign: "left", "& input, & textarea": { textAlign: "center" } }}
    />
    <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1}>
      <Typography variant="caption" color={value.length >= max ? "error" : "text.disabled"}>{value.length}/{max}</Typography>
      <Stack direction="row" spacing={0.5}>
        <IconButton size="small" onClick={onCancel} disabled={isSaving} aria-label="Cancel">
          <CloseIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onSave} disabled={isSaving} aria-label="Save" sx={{ bgcolor: orange, color: "#fff", "&:hover": { bgcolor: "#d85c5c" }, "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.6 } }}>
          <CheckIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  </Box>
);

export default AppLayout({ showListOnMobile: false, sidebar: "settings" })(Group);
