import {
  ArrowBack as ArrowBackIcon,
  CameraAltOutlined as CameraIcon,
  CheckRounded as CheckIcon,
  CloseRounded as CloseIcon,
  GroupsOutlined as GroupsIcon,
  PersonSearchOutlined as EmptyIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  InputBase,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from "react";
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { orange } from '../../constants/color';
import { useErrors } from '../../hooks/hook';
import { transformImage } from '../../lib/features';
import { useAvailableFriendsQuery, useNewGroupMutation } from '../../redux/api/api';
import { setIsNewGroup, setIsSearch } from '../../redux/reducers/misc';
import { ButtonLoader } from '../layout/Loaders';
import { VisuallyHiddenInput } from '../styles/StyledComponent';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;
const MAX_AVATAR_MB = 5;
const MIN_OTHERS = 2;   // plus you = 3
const MAX_OTHERS = 14;  // plus you = 15

const inputSx = {
  bgcolor: "#f4f4f6",
  borderRadius: "12px",
  px: 1.5,
  py: 1,
  border: "1px solid transparent",
  transition: "border-color 0.15s, background-color 0.15s, box-shadow 0.15s",
  "&.Mui-focused": { bgcolor: "#fff", borderColor: orange, boxShadow: "0 0 0 4px rgba(234,112,112,0.15)" },
};

const pillButtonSx = { borderRadius: "999px", px: 2.5, minWidth: 130 };

const NewGroup = () => {
  const { isNewGroup } = useSelector((state) => state.misc);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // 1 = group details, 2 = add people
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const { isError, isLoading, error, data } = useAvailableFriendsQuery();
  const [newGroup, { isLoading: isCreating }] = useNewGroupMutation();

  useErrors([{ isError, error }]);

  useEffect(() => () => avatarPreview && URL.revokeObjectURL(avatarPreview), [avatarPreview]);

  const friends = data?.data ?? [];
  const selectedFriends = useMemo(
    () => selectedIds.map((id) => friends.find((f) => f._id === id)).filter(Boolean),
    [selectedIds, friends]
  );
  const filteredFriends = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? friends.filter((f) => f.name?.toLowerCase().includes(q)) : friends;
  }, [friends, filter]);

  const remaining = Math.max(0, MIN_OTHERS - selectedIds.length);
  const canContinue = groupName.trim().length > 0;
  const canCreate = canContinue && remaining === 0 && !isCreating;

  const closeHandler = () => dispatch(setIsNewGroup(false));

  const avatarChangeHandler = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_AVATAR_MB}MB`);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const toggleMember = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_OTHERS) {
        toast.error(`A group can have at most ${MAX_OTHERS + 1} members`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const goToPeople = () => {
    if (!canContinue) return toast.error("Give your group a name");
    setStep(2);
  };

  const createGroup = async () => {
    if (remaining > 0) return toast.error(`Select ${remaining} more ${remaining === 1 ? "friend" : "friends"}`);

    const formData = new FormData();
    formData.append("name", groupName.trim());
    if (description.trim()) formData.append("description", description.trim());
    selectedIds.forEach((id) => formData.append("members", id));
    if (avatarFile) formData.append("avatar", avatarFile);

    const response = await newGroup(formData);
    if (response.data) {
      toast.success(`"${groupName.trim()}" created`);
      closeHandler();
      if (response.data.chatId) navigate(`/chat/${response.data.chatId}`);
    } else {
      toast.error(response.error?.data?.message || "Couldn't create group");
    }
  };

  const submitHandler = (e) => {
    e.preventDefault();
    if (step === 1) goToPeople();
    else createGroup();
  };

  const openFindPeople = () => {
    closeHandler();
    dispatch(setIsSearch(true));
  };

  return (
    <Dialog
      open={isNewGroup}
      onClose={isCreating ? undefined : closeHandler}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        component: "form",
        onSubmit: submitHandler,
        noValidate: true,
        sx: { borderRadius: fullScreen ? 0 : "20px", height: fullScreen ? "100%" : "min(720px, 90vh)", maxWidth: fullScreen ? "100%" : 520 },
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pt: 2, pb: 1.5 }}>
        {step === 2 && (
          <IconButton onClick={() => setStep(1)} disabled={isCreating} aria-label="Back to group details" sx={{ color: "text.secondary" }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Box sx={{ flex: 1, minWidth: 0, pl: step === 1 ? 0.5 : 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="0.04em">
            STEP {step} OF 2
          </Typography>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2} noWrap>
            {step === 1 ? "New group" : "Add people"}
          </Typography>
        </Box>
        <IconButton onClick={closeHandler} disabled={isCreating} aria-label="Close" sx={{ color: "text.secondary" }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Progress */}
      <Stack direction="row" spacing={0.75} sx={{ px: 2.5, pb: 2 }}>
        {[1, 2].map((s) => (
          <Box key={s} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: s <= step ? orange : "#ececf0", transition: "background-color 0.2s" }} />
        ))}
      </Stack>

      {step === 1 ? (
        /* ---------- Step 1: group details ---------- */
        <Box className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", px: 2.5, pb: 2 }}>
          {/* Picture */}
          <Stack alignItems="center" spacing={1} sx={{ pt: 1, pb: 3 }}>
            <Box
              component="label"
              aria-label={avatarFile ? "Change group picture" : "Add group picture"}
              sx={{ position: "relative", cursor: "pointer", borderRadius: "50%", "&:hover .overlay, &:focus-within .overlay": { opacity: 1 } }}
            >
              <Avatar
                src={avatarPreview || undefined}
                sx={{ width: 96, height: 96, bgcolor: "#f4f4f6", color: "text.disabled", border: avatarPreview ? "none" : "2px dashed #d4d4d8" }}
              >
                <GroupsIcon fontSize="large" />
              </Avatar>
              <Box
                className="overlay"
                sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
              >
                <CameraIcon />
              </Box>
              <Box
                sx={{ position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: "50%", bgcolor: orange, color: "#fff", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CameraIcon sx={{ fontSize: 15 }} />
              </Box>
              <VisuallyHiddenInput type="file" accept="image/*" onChange={avatarChangeHandler} />
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {avatarFile ? "Group picture added" : "Add a group picture (optional)"}
              </Typography>
              {avatarFile && (
                <Button size="small" onClick={() => { setAvatarFile(null); setAvatarPreview(""); }} sx={{ minWidth: 0, p: 0.25, fontSize: "0.75rem", color: "text.secondary" }}>
                  Remove
                </Button>
              )}
            </Stack>
          </Stack>

          <Stack spacing={2.5}>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
                <Typography component="label" htmlFor="group-name" variant="body2" fontWeight={600}>Group name</Typography>
                <Typography variant="caption" color={groupName.length >= NAME_MAX ? "error" : "text.disabled"}>
                  {groupName.length}/{NAME_MAX}
                </Typography>
              </Stack>
              <InputBase
                id="group-name"
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value.slice(0, NAME_MAX))}
                placeholder="e.g. Weekend plans"
                fullWidth
                sx={inputSx}
              />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
                <Typography component="label" htmlFor="group-description" variant="body2" fontWeight={600}>
                  Description <Typography component="span" variant="caption" color="text.disabled">(optional)</Typography>
                </Typography>
                <Typography variant="caption" color={description.length >= DESCRIPTION_MAX ? "error" : "text.disabled"}>
                  {description.length}/{DESCRIPTION_MAX}
                </Typography>
              </Stack>
              <InputBase
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                placeholder="What's this group about?"
                fullWidth
                multiline
                minRows={3}
                maxRows={5}
                sx={inputSx}
              />
            </Box>
          </Stack>
        </Box>
      ) : (
        /* ---------- Step 2: add people ---------- */
        <>
          {/* Group summary + selected chips */}
          <Box sx={{ px: 2.5, pb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: selectedFriends.length ? 1.5 : 0 }}>
              <Avatar src={avatarPreview || undefined} sx={{ width: 36, height: 36, bgcolor: "#f4f4f6", color: "text.disabled" }}>
                <GroupsIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>{groupName.trim()}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedIds.length} selected · {selectedIds.length + 1}/{MAX_OTHERS + 1} members
                </Typography>
              </Box>
            </Stack>

            {selectedFriends.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }} className="custom-scrollbar">
                {selectedFriends.map((friend) => (
                  <Stack
                    key={friend._id}
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ flexShrink: 0, bgcolor: "rgba(234,112,112,0.1)", borderRadius: "999px", pl: 0.5, pr: 0.25, py: 0.25 }}
                  >
                    <Avatar src={transformImage(friend.avatar)} sx={{ width: 24, height: 24 }} />
                    <Typography variant="body2" fontWeight={600} color="#c74e4e" sx={{ maxWidth: 110 }} noWrap>
                      {friend.name.split(" ")[0]}
                    </Typography>
                    <IconButton size="small" onClick={() => toggleMember(friend._id)} aria-label={`Remove ${friend.name}`} sx={{ color: "#c74e4e", p: 0.25 }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          <Box sx={{ px: 2.5, pt: 1.5, pb: 1 }}>
            <InputBase
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search friends"
              fullWidth
              inputProps={{ "aria-label": "Search friends" }}
              startAdornment={<SearchIcon sx={{ color: "text.disabled", mr: 1, fontSize: 20 }} />}
              sx={{ ...inputSx, py: 0.75 }}
            />
          </Box>

          <Box className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 1 }}>
            {isLoading ? (
              <Stack>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ px: 1, py: 1.25 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton width="50%" sx={{ flex: 1 }} />
                    <Skeleton variant="circular" width={22} height={22} />
                  </Stack>
                ))}
              </Stack>
            ) : friends.length === 0 ? (
              <Stack alignItems="center" textAlign="center" spacing={1} sx={{ pt: 5, px: 3 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                  <EmptyIcon sx={{ color: "text.disabled" }} />
                </Box>
                <Typography fontWeight={600}>No friends yet</Typography>
                <Typography variant="body2" color="text.secondary">Add friends first, then create a group with them.</Typography>
                <Button variant="contained" size="small" onClick={openFindPeople} sx={{ borderRadius: "999px", mt: 1 }}>
                  Find people
                </Button>
              </Stack>
            ) : filteredFriends.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ pt: 4 }}>
                No friends match "{filter.trim()}"
              </Typography>
            ) : (
              <Stack divider={<Divider sx={{ ml: "64px", mr: 1 }} />}>
                {filteredFriends.map((friend) => (
                  <FriendRow
                    key={friend._id}
                    friend={friend}
                    selected={selectedIds.includes(friend._id)}
                    onToggle={() => toggleMember(friend._id)}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </>
      )}

      {/* Footer */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2.5, py: 1.75, borderTop: "1px solid", borderColor: "divider" }}
      >
        <Typography variant="body2" color={step === 2 && !remaining ? "text.primary" : "text.secondary"} sx={{ flex: 1, minWidth: 0 }} noWrap>
          {step === 1
            ? (canContinue ? "Next, add people" : "Name your group to continue")
            : remaining
              ? `Select ${remaining} more ${remaining === 1 ? "friend" : "friends"}`
              : `${selectedIds.length + 1} members including you`}
        </Typography>

        {step === 1 ? (
          <Button type="submit" variant="contained" disabled={!canContinue} sx={pillButtonSx}>
            Next
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            disabled={!canCreate}
            sx={{ ...pillButtonSx, ...(isCreating && { "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.85 } }) }}
          >
            {isCreating ? <ButtonLoader label="Creating" /> : "Create group"}
          </Button>
        )}
      </Stack>
    </Dialog>
  );
};

const FriendRow = ({ friend, selected, onToggle }) => (
  <Box
    component="button"
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={onToggle}
    sx={{
      all: "unset",
      boxSizing: "border-box",
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 1,
      py: 1.1,
      borderRadius: "12px",
      cursor: "pointer",
      transition: "background-color 0.15s",
      "&:hover": { bgcolor: "#f8f8fa" },
      "&:focus-visible": { outline: `2px solid ${orange}`, outlineOffset: -2 },
    }}
  >
    <Avatar src={transformImage(friend.avatar)} sx={{ width: 40, height: 40 }} />
    <Typography fontWeight={selected ? 600 : 500} sx={{ flex: 1, minWidth: 0 }} noWrap>
      {friend.name}
    </Typography>
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "2px solid",
        borderColor: selected ? orange : "#d4d4d8",
        bgcolor: selected ? orange : "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {selected && <CheckIcon sx={{ fontSize: 15 }} />}
    </Box>
  </Box>
);

export default NewGroup;
