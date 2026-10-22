import { ContentCopyRounded as CopyIcon, LinkRounded as LinkIcon } from "@mui/icons-material";
import { Box, Button, CircularProgress, Dialog, FormControlLabel, IconButton, Radio, RadioGroup, Stack, Tooltip, Typography } from "@mui/material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useCreateGroupInviteMutation, useGroupInviteQuery, useRevokeGroupInviteMutation } from "../../redux/api/api";
import { ButtonLoader } from "../layout/Loaders";

// Same choices as the server (INVITE_EXPIRY_OPTIONS)
const EXPIRY_CHOICES = [
  { value: 24 * 60 * 60, label: "24 hours" },
  { value: 7 * 24 * 60 * 60, label: "7 days" },
  { value: 30 * 24 * 60 * 60, label: "30 days" },
];

export const inviteUrl = (code) => `${window.location.origin}/join/${code}`;

const formatExpiry = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The group's invite link (admin only): copy it, make a new one, or turn it off. */
const InviteLinkDialog = ({ open, onClose, chatId }) => {
  const [seconds, setSeconds] = useState(String(EXPIRY_CHOICES[1].value));
  const { data, isLoading } = useGroupInviteQuery(chatId, { skip: !open || !chatId });
  const [createInvite, { isLoading: isCreating }] = useCreateGroupInviteMutation();
  const [revokeInvite, { isLoading: isRevoking }] = useRevokeGroupInviteMutation();
  const invite = data?.invite;
  const busy = isCreating || isRevoking;

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const run = async (mutate, arg) => {
    const res = await mutate(arg);
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    return res.data;
  };

  const create = async () => {
    const result = await run(createInvite, { chatId, seconds: Number(seconds) });
    if (result?.invite) copy(result.invite.code);
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} PaperProps={{ sx: { borderRadius: "20px", width: "100%", maxWidth: 420, m: 2 } }}>
      <Stack spacing={1} sx={{ p: 3, pb: 1 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: "12px", display: "grid", placeItems: "center", bgcolor: "rgba(38,148,171,0.12)", color: "#2694ab" }}>
          <LinkIcon />
        </Box>
        <Typography variant="h6" fontWeight={700}>Invite via link</Typography>
        <Typography variant="body2" color="text.secondary">
          Anyone with the link can join, even if they aren't your friend. Only share it with people you trust.
        </Typography>
      </Stack>

      <Box sx={{ px: 3, py: 1 }}>
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>
        ) : invite ? (
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, pl: 1.5, borderRadius: "12px", bgcolor: "action.hover" }}>
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontFamily: "monospace", wordBreak: "break-all" }}>
                {inviteUrl(invite.code)}
              </Typography>
              <Tooltip title="Copy link">
                <IconButton onClick={() => copy(invite.code)} aria-label="Copy invite link"><CopyIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary">Works until {formatExpiry(invite.expires_at)}</Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">There's no active link.</Typography>
        )}

        <Typography variant="subtitle2" sx={{ pt: 2 }}>{invite ? "New link lasts" : "Link lasts"}</Typography>
        <RadioGroup row value={seconds} onChange={(e) => setSeconds(e.target.value)}>
          {EXPIRY_CHOICES.map(({ value, label }) => (
            <FormControlLabel key={value} value={String(value)} control={<Radio size="small" />} label={label} />
          ))}
        </RadioGroup>
        {invite && (
          <Typography variant="caption" color="text.secondary">A new link replaces this one, so the old link stops working.</Typography>
        )}
      </Box>

      <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" sx={{ px: 3, pb: 3, pt: 1 }}>
        {invite && (
          <Button color="error" onClick={() => run(revokeInvite, chatId)} disabled={busy} sx={{ borderRadius: "999px", mr: "auto" }}>
            {isRevoking ? <ButtonLoader label="Turning off" /> : "Turn off"}
          </Button>
        )}
        <Button onClick={onClose} disabled={busy} sx={{ borderRadius: "999px", color: "text.secondary" }}>Close</Button>
        <Button variant="contained" onClick={create} disabled={busy || isLoading} sx={{ borderRadius: "999px", px: 2.5, minWidth: 96 }}>
          {isCreating ? <ButtonLoader label="Creating" /> : invite ? "New link" : "Create link"}
        </Button>
      </Stack>
    </Dialog>
  );
};

export default InviteLinkDialog;
