import {
  ChatBubbleOutlineRounded as MessageIcon,
  CheckRounded as SentIcon,
  CloseRounded as CloseIcon,
  GroupsOutlined as GroupsIcon,
  PersonAddAlt1Rounded as AddIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Dialog,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import moment from "moment";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fullName, transformImage } from "../../lib/features";
import { useGetUserProfileQuery, useSendFriendRequestMutation } from "../../redux/api/api";
import { setProfileUserId } from "../../redux/reducers/misc";
import PhotoViewer from "../shared/PhotoViewer";
import ProfileCover from "../shared/ProfileCover";

/**
 * Someone's profile, opened from anywhere with dispatch(setProfileUserId(id)): a 1:1 chat's header,
 * group members, sender names in groups, people search. Tap the photo to see it full size.
 */
const UserProfileDialog = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { profileUserId } = useSelector((state) => state.misc);
  // "photo" | "cover" | null: which image is open full size
  const [viewing, setViewing] = useState(null);

  const { data, isLoading, isError, refetch } = useGetUserProfileQuery(profileUserId, { skip: !profileUserId });
  const [sendFriendRequest, { isLoading: isSending }] = useSendFriendRequestMutation();

  const close = () => {
    setViewing(null);
    dispatch(setProfileUserId(null));
  };
  const go = (path) => {
    close();
    navigate(path);
  };

  const addFriend = async () => {
    const res = await sendFriendRequest({ user_id: profileUserId });
    if (res.error && res.error.status !== 409) return toast.error(res.error.data?.message || "Couldn't send request");
    toast.success(`Request sent to ${fullName(data.profile)}`);
    refetch();
  };

  const profile = data?.profile;
  const status = data?.request_status;
  const groups = data?.common_groups ?? [];

  const action = {
    self: <Button variant="outlined" onClick={() => go("/settings/profile")} sx={{ borderRadius: "999px", px: 3 }}>Edit profile</Button>,
    friend: data?.chat_id && (
      <Button variant="contained" startIcon={<MessageIcon />} onClick={() => go(`/chat/${data.chat_id}`)} sx={{ borderRadius: "999px", px: 3 }}>
        Message
      </Button>
    ),
    sent: <Button variant="outlined" disabled startIcon={<SentIcon />} sx={{ borderRadius: "999px", px: 3 }}>Request sent</Button>,
    received: <Button variant="contained" onClick={() => go("/notifications")} sx={{ borderRadius: "999px", px: 3 }}>Respond to request</Button>,
  }[status] ?? (
    <Button variant="contained" startIcon={<AddIcon />} onClick={addFriend} disabled={isSending} sx={{ borderRadius: "999px", px: 3 }}>
      Add friend
    </Button>
  );

  return (
    <>
      <Dialog
        open={!!profileUserId}
        onClose={close}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: "20px" } } }}
      >
        <ProfileCover src={profile?.cover?.url} height={140} onOpen={() => setViewing("cover")}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close profile"
            sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "#fff" } }}
          >
            <CloseIcon />
          </IconButton>
        </ProfileCover>

        {/* The photo overlaps the cover */}
        <Stack alignItems="center" textAlign="center" spacing={0.5} sx={{ px: 3, pb: 4, mt: "-60px", position: "relative" }}>
          {isLoading || !profile ? (
            isError ? (
              <Typography color="text.secondary" sx={{ py: 6 }}>This profile isn't available.</Typography>
            ) : (
              <>
                <Skeleton variant="circular" width={120} height={120} sx={{ border: "4px solid #fff", bgcolor: "#ececf0" }} />
                <Skeleton width={160} height={32} />
                <Skeleton width={100} />
              </>
            )
          ) : (
            <>
              <ButtonBase
                onClick={() => profile.avatar?.url && setViewing("photo")}
                aria-label={`View ${fullName(profile)}'s photo`}
                sx={{ borderRadius: "50%", mb: 1.5 }}
              >
                <Avatar src={transformImage(profile.avatar?.url, 400)} sx={{ width: 120, height: 120, border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }} />
              </ButtonBase>
              <Typography variant="h5" fontWeight={700} sx={{ wordBreak: "break-word" }}>{fullName(profile)}</Typography>
              <Typography color="text.secondary">@{profile.username}</Typography>
              {profile.bio && (
                <Typography sx={{ pt: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{profile.bio}</Typography>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ pt: 1 }}>
                Joined {moment(profile.created_at).format("MMMM YYYY")}
              </Typography>

              <Box sx={{ pt: 2.5 }}>{action}</Box>

              {groups.length > 0 && (
                <Box sx={{ alignSelf: "stretch", textAlign: "left", pt: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, color: "text.secondary" }}>
                    <GroupsIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      {groups.length} {groups.length === 1 ? "group" : "groups"} in common
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    {groups.map((group) => (
                      <ButtonBase
                        key={group.id}
                        onClick={() => go(`/chat/${group.id}`)}
                        sx={{ justifyContent: "flex-start", px: 1.5, py: 1, borderRadius: "10px", bgcolor: "#f6f6f8", "&:hover": { bgcolor: "#efeff2" } }}
                      >
                        <Typography variant="body2" fontWeight={500} noWrap>{group.name}</Typography>
                      </ButtonBase>
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Dialog>

      <PhotoViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        src={viewing === "cover" ? profile?.cover?.url : profile?.avatar?.url}
        title={profile && fullName(profile)}
      />
    </>
  );
};

export default UserProfileDialog;
