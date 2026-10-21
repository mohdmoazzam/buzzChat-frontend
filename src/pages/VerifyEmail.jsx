import { useInputValidation } from "6pp";
import {
  ChatBubbleRounded as ChatIcon,
  MarkEmailReadOutlined as MailIcon,
  PinOutlined as PinIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { ButtonLoader } from "../components/layout/Loaders";
import { server } from "../constants/config";
import { accentDark, brandGradient, surfaceMuted } from "../constants/theme";
import { userExists, userNotExists } from "../redux/reducers/auth";

const linkButtonSx = {
  border: "none",
  background: "none",
  p: 0,
  font: "inherit",
  fontWeight: 600,
  color: accentDark,
  cursor: "pointer",
  "&:hover": { textDecoration: "underline" },
  "&:disabled": { opacity: 0.6, cursor: "default" },
};

// Shown after sign-up until the emailed code is entered; the account can't do anything else yet
const VerifyEmail = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const otp = useInputValidation("");
  const [isLoading, setIsLoading] = useState(false);

  const config = {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${server}/api/v1/user/verify-email`,
        { otp: otp.value },
        config,
      );
      toast.success(data.message);
      dispatch(userExists(data.user));
    } catch (ex) {
      toast.error(ex?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${server}/api/v1/user/verify-email/resend`,
        null,
        config,
      );
      toast.success(data.message);
    } catch (ex) {
      toast.error(ex?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${server}/api/v1/user/logout`, null, config);
    } catch (err) {
      // Still clear local session even if the request fails
    }
    dispatch(userNotExists());
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: { xs: "#fff", sm: surfaceMuted },
        px: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          bgcolor: "#fff",
          borderRadius: "20px",
          boxShadow: { xs: "none", sm: "0 10px 40px rgba(0,0,0,0.06)" },
          p: { xs: 1, sm: 4 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          mb={3}
          sx={{ color: "primary.main" }}
        >
          <ChatIcon />
          <Typography variant="h6" fontWeight={700}>
            BuzzChat
          </Typography>
        </Stack>

        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "16px",
            display: "grid",
            placeItems: "center",
            color: "white",
            background: brandGradient,
            mb: 2,
          }}
        >
          <MailIcon />
        </Box>

        <Typography
          variant="h4"
          fontWeight={700}
          fontSize={{ xs: "1.75rem", sm: "2rem" }}
        >
          Verify your email
        </Typography>
        <Typography color="text.secondary" mt={0.5} mb={3}>
          Enter the 6-digit code we sent to <strong>{user?.email}</strong>.
        </Typography>

        <form onSubmit={handleVerify}>
          <Stack spacing={2}>
            <TextField
              required
              fullWidth
              autoFocus
              label="6-digit code"
              autoComplete="one-time-code"
              value={otp.value}
              onChange={otp.changeHandler}
              inputProps={{
                maxLength: 6,
                inputMode: "numeric",
                pattern: "[0-9]{6}",
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PinIcon sx={{ color: "text.disabled", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
              sx={{
                py: 1.4,
                fontSize: "1rem",
                "&.Mui-disabled": {
                  bgcolor: "primary.main",
                  color: "white",
                  opacity: 0.85,
                },
              }}
            >
              {isLoading ? <ButtonLoader label="Verifying" /> : "Verify email"}
            </Button>
          </Stack>
        </form>

        <Typography
          textAlign="center"
          variant="body2"
          color="text.secondary"
          mt={3}
        >
          Didn't get it?{" "}
          <Box
            component="button"
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            sx={linkButtonSx}
          >
            Resend code
          </Box>
          {" · "}
          <Box
            component="button"
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            sx={linkButtonSx}
          >
            Use another account
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default VerifyEmail;
