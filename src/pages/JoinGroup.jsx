import { LinkOffRounded as LinkOffIcon } from "@mui/icons-material";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import React from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ButtonLoader } from "../components/layout/Loaders";
import AvatarCard from "../components/shared/AvatarCard";
import { surfaceMuted } from "../constants/theme";
import { useInvitePreviewQuery, useJoinWithInviteMutation } from "../redux/api/api";

// /join/:code — the page an invite link opens: shows the group, then joins it
const JoinGroup = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useInvitePreviewQuery(code);
  const [joinWithInvite, { isLoading: isJoining }] = useJoinWithInviteMutation();
  const group = data?.group;

  const join = async () => {
    const res = await joinWithInvite(code);
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    navigate(`/chat/${res.data.chat_id}`, { replace: true });
  };

  let content;
  if (isLoading) {
    content = <CircularProgress />;
  } else if (!group) {
    content = (
      <>
        <LinkOffIcon sx={{ fontSize: 56, color: "text.secondary" }} />
        <Typography variant="h6" fontWeight={700}>Can't open this invite</Typography>
        <Typography color="text.secondary">
          {error?.data?.message || "This invite link is invalid or has expired"}. Ask the group admin for a new link.
        </Typography>
        <Button component={Link} to="/" variant="contained" sx={{ borderRadius: "999px" }}>Go to chats</Button>
      </>
    );
  } else {
    content = (
      <>
        <AvatarCard avatar={group.avatar} size={88} />
        <Typography variant="h5" fontWeight={700} sx={{ wordBreak: "break-word" }}>{group.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Group · {group.member_count} {group.member_count === 1 ? "member" : "members"}
        </Typography>
        {group.description && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{group.description}</Typography>
        )}
        {group.is_member ? (
          <>
            <Typography color="text.secondary">You're already in this group.</Typography>
            <Button variant="contained" onClick={() => navigate(`/chat/${group.chat_id}`, { replace: true })} sx={{ borderRadius: "999px" }}>
              Open chat
            </Button>
          </>
        ) : group.is_full ? (
          <>
            <Typography color="text.secondary">This group is full, so no one else can join right now.</Typography>
            <Button component={Link} to="/" sx={{ borderRadius: "999px" }}>Go to chats</Button>
          </>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button component={Link} to="/" disabled={isJoining} sx={{ borderRadius: "999px", color: "text.secondary" }}>Not now</Button>
            <Button variant="contained" onClick={join} disabled={isJoining} sx={{ borderRadius: "999px", px: 3, minWidth: 120 }}>
              {isJoining ? <ButtonLoader label="Joining" /> : "Join group"}
            </Button>
          </Stack>
        )}
      </>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: surfaceMuted, p: 2 }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 400, borderRadius: "24px", p: 4 }}>
        <Stack alignItems="center" textAlign="center" spacing={1.5}>{content}</Stack>
      </Paper>
    </Box>
  );
};

export default JoinGroup;
