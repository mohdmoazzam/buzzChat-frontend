import { PinOutlined as PinIcon, WarningAmberRounded as WarningIcon } from "@mui/icons-material";
import { Box, Button, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import AppLayout from "../components/layout/AppLayout";
import { ButtonLoader } from "../components/layout/Loaders";
import Title from "../components/shared/Title";
import { useDeleteAccountMutation, useSendDeleteAccountCodeMutation } from "../redux/api/api";
import { userNotExists } from "../redux/reducers/auth";
import { getSocket } from "../socket";

const CONSEQUENCES = [
  "Your profile, photo and username",
  "Your 1:1 chats, for both people, with their messages and files",
  "Your messages and files in groups",
  "Friend requests and notifications",
  "Groups you admin pass to the longest-standing member (or are deleted if fewer than 2 people would be left)",
];

// Delete my account: email a code, then type it to confirm. Can't be undone.
const DeleteAccount = () => {
  const dispatch = useDispatch();
  const socket = getSocket();
  const { user } = useSelector((state) => state.auth);
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendCode, { isLoading: isSending }] = useSendDeleteAccountCodeMutation();
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();

  const requestCode = async () => {
    const res = await sendCode();
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    setCodeSent(true);
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return;
    const res = await deleteAccount({ otp });
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    // The account is gone: drop the socket and the local session, back to the login screen
    socket?.disconnect();
    dispatch(userNotExists());
    toast.success(res.data.message);
  };

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Delete account · BuzzChat" />
      <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 4, sm: 7 }, maxWidth: 620 }}>
        <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.75rem", sm: "2.25rem" }}>
          Delete account
        </Typography>
        <Typography color="text.secondary" mt={0.5}>
          Permanently delete @{user?.username} and everything that belongs to it.
        </Typography>

        <Box sx={{ mt: { xs: 4, sm: 5 }, p: 2.5, borderRadius: "16px", bgcolor: "rgba(211,47,47,0.05)", border: "1px solid rgba(211,47,47,0.18)" }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <WarningIcon color="error" fontSize="small" />
            <Typography fontWeight={700} color="error.main">This can't be undone</Typography>
          </Stack>
          <Typography variant="body2" fontWeight={600} mb={0.75}>What gets deleted:</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary", "& li": { mb: 0.5, fontSize: "0.9rem" } }}>
            {CONSEQUENCES.map((item) => <li key={item}>{item}</li>)}
          </Box>
        </Box>

        {!codeSent ? (
          <Stack mt={4} spacing={1.5} alignItems="flex-start">
            <Typography color="text.secondary">
              To confirm it's you, we'll email a 6-digit code to <strong>{user?.email}</strong>.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={requestCode}
              disabled={isSending}
              sx={{ borderRadius: "999px", px: 3, minWidth: 200 }}
            >
              {isSending ? <ButtonLoader label="Sending code" /> : "Email me a code"}
            </Button>
          </Stack>
        ) : (
          <Stack component="form" onSubmit={confirmDelete} mt={4} spacing={2}>
            <Typography color="text.secondary">
              Enter the code we sent to <strong>{user?.email}</strong>. It expires in 10 minutes.
            </Typography>
            <TextField
              required
              autoFocus
              label="6-digit code"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 }}
              InputProps={{
                sx: { borderRadius: "12px" },
                startAdornment: (
                  <InputAdornment position="start">
                    <PinIcon sx={{ color: "text.disabled", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 320 }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
              <Button
                type="submit"
                variant="contained"
                color="error"
                disabled={otp.length !== 6 || isDeleting}
                sx={{ borderRadius: "999px", px: 3, minWidth: 240, "&.Mui-disabled": isDeleting ? { bgcolor: "error.main", color: "#fff", opacity: 0.8 } : {} }}
              >
                {isDeleting ? <ButtonLoader label="Deleting account" /> : "Delete my account permanently"}
              </Button>
              <Button onClick={requestCode} disabled={isSending || isDeleting} sx={{ borderRadius: "999px", color: "text.secondary" }}>
                Resend code
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false, sidebar: "settings" })(DeleteAccount);
