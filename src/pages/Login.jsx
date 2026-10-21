import { useFileHandler, useInputValidation } from '6pp';
import {
  CameraAlt as CameraAltIcon,
  ChatBubbleRounded as ChatIcon,
  LockOutlined as LockIcon,
  PersonOutline as PersonIcon,
  Visibility,
  VisibilityOff,
  AlternateEmail as AtIcon,
  BadgeOutlined as BadgeIcon,
  NotesOutlined as NotesIcon,
  MailOutline as MailIcon,
  PinOutlined as PinIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from 'axios';
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { ButtonLoader } from '../components/layout/Loaders';
import { APP_MAX_WIDTH } from '../constants/theme';
import { VisuallyHiddenInput } from '../components/styles/StyledComponent';
import { orange } from "../constants/color";
import { server } from "../constants/config";
import { setToken, userExists } from '../redux/reducers/auth';
import { usernameValidator } from '../utils/validators';

const accentDark = "#d85c5c";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fafafa",
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cfcfcf" },
    "&.Mui-focused": { backgroundColor: "#fff" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: orange, borderWidth: "2px" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: accentDark },
};

const iconAdornment = (Icon) => (
  <InputAdornment position="start">
    <Icon sx={{ color: "text.disabled", fontSize: 20 }} />
  </InputAdornment>
);

const Login = () => {

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarMissing, setAvatarMissing] = useState(false);
  // Forgot password flow: null (off), "email" (ask for email) or "reset" (enter code + new password)
  const [forgotStep, setForgotStep] = useState(null);

  const dispatch = useDispatch();

  const email = useInputValidation("");
  const firstName = useInputValidation("");
  const lastName = useInputValidation("");
  const bio = useInputValidation("");
  const username = useInputValidation("", usernameValidator);
  const password = useInputValidation("");
  const otp = useInputValidation("");
  const avatar = useFileHandler("single");

  const toggleLogin = () => {
    setIsLogin((prev) => !prev);
    setShowPassword(false);
    setAvatarMissing(false);
  };

  const openForgot = (step) => {
    setIsLogin(true);
    setShowPassword(false);
    setForgotStep(step);
  };

  const requestResetCode = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${server}/api/v1/user/forgot-password`, { email: email.value }, {
        headers: { "Content-Type": "application/json" }
      });
      toast.success(data.message);
      setForgotStep("reset");
    } catch (ex) {
      toast.error(ex?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = (e) => {
    e.preventDefault();
    requestResetCode();
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${server}/api/v1/user/reset-password`, {
        email: email.value,
        otp: otp.value,
        password: password.value,
      }, {
        headers: { "Content-Type": "application/json" }
      });
      toast.success(data.message);
      openForgot(null);
    } catch (ex) {
      toast.error(ex?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${server}/api/v1/user/login`, {
        username: username.value,
        password: password.value
      }, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" }
      });
      dispatch(userExists(data.user));
      dispatch(setToken(data));
      toast.success(data.message);
    } catch (ex) {
      toast.error(ex?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!avatar.file) {
      setAvatarMissing(true);
      return toast.error("Please add a profile photo");
    }
    if (username.error) return toast.error(username.error);

    setIsLoading(true);
    try {
      // Upload the photo first (no account yet, so this works logged out), then register with its id
      const files = new FormData();
      files.append("files", avatar.file);
      const { data: uploaded } = await axios.post(`${server}/api/v1/assets`, files, { withCredentials: true });

      const { data } = await axios.post(`${server}/api/v1/user/register`, {
        email: email.value,
        first_name: firstName.value,
        last_name: lastName.value,
        username: username.value,
        bio: bio.value,
        password: password.value,
        avatar_id: uploaded.assets[0].id,
      }, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" }
      });
      dispatch(userExists(data.user));
      dispatch(setToken(data));
      toast.success(data.message);
    } catch (ex) {
      toast.error(ex?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const avatarChangeHandler = (e) => {
    avatar.changeHandler(e);
    setAvatarMissing(false);
  };

  const passwordField = (
    <TextField
      required
      fullWidth
      label={forgotStep ? "New password" : "Password"}
      type={showPassword ? "text" : "password"}
      autoComplete={isLogin && !forgotStep ? "current-password" : "new-password"}
      value={password.value}
      onChange={password.changeHandler}
      sx={fieldSx}
      InputProps={{
        startAdornment: iconAdornment(LockIcon),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              size="small"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const usernameField = (
    <TextField
      required
      fullWidth
      label="Username"
      autoComplete="username"
      value={username.value}
      onChange={username.changeHandler}
      error={!isLogin && !!username.value && !!username.error}
      helperText={!isLogin && username.value && username.error ? username.error : ""}
      sx={fieldSx}
      InputProps={{ startAdornment: iconAdornment(AtIcon) }}
    />
  );

  const emailField = (
    <TextField
      required
      fullWidth
      type="email"
      label="Email"
      autoComplete="email"
      value={email.value}
      onChange={email.changeHandler}
      sx={fieldSx}
      inputProps={{ maxLength: 254 }}
      InputProps={{ startAdornment: iconAdornment(MailIcon) }}
    />
  );

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

  const submitButton = (label, loadingLabel) => (
    <Button
      type="submit"
      variant="contained"
      fullWidth
      disableElevation
      disabled={isLoading}
      sx={{
        py: 1.4,
        borderRadius: "12px",
        textTransform: "none",
        fontSize: "1rem",
        fontWeight: 600,
        bgcolor: orange,
        "&:hover": { bgcolor: accentDark },
        "&.Mui-disabled": { bgcolor: orange, color: "white", opacity: 0.85 },
      }}
    >
      {isLoading ? <ButtonLoader label={loadingLabel} /> : label}
    </Button>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: { xs: "#fff", md: "#f6f6f8" },
      }}
    >
      {/* On large screens both panels form one full-height centered column with side space */}
      <Box
        sx={{
          display: "flex",
          width: "100%",
          // Same width as the main app column (APP_MAX_WIDTH in constants/theme)
          maxWidth: { lg: APP_MAX_WIDTH },
          minHeight: "100vh",
          overflow: "hidden",
          bgcolor: { lg: "#fff" },
          boxShadow: { lg: "0 0 48px rgba(30,20,60,0.08)" },
        }}
      >

      {/* Brand panel (desktop only) */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          color: "white",
          background: `linear-gradient(145deg, ${orange} 0%, #c94f7c 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.08)", top: -120, right: -140 }} />
        <Box sx={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.06)", bottom: -100, left: -80 }} />

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ position: "relative" }}>
          <ChatIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>BuzzChat</Typography>
        </Stack>

        <Box sx={{ position: "relative", maxWidth: 440 }}>
          <Typography variant="h3" fontWeight={700} lineHeight={1.15} mb={2}>
            Conversations that keep up with you.
          </Typography>
          <Typography sx={{ opacity: 0.85, fontSize: "1.1rem" }}>
            Real-time messaging, group chats and file sharing, all in one place.
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.7, position: "relative" }}>
          © {new Date().getFullYear()} BuzzChat
        </Typography>
      </Box>

      {/* Form panel */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 4 }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 420,
            bgcolor: "#fff",
            borderRadius: { xs: 0, md: "20px", lg: 0 },
            boxShadow: { xs: "none", md: "0 10px 40px rgba(0,0,0,0.06)", lg: "none" },
            p: { xs: 1, sm: 4 },
          }}
        >
          {/* Mobile logo */}
          <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ display: { xs: "flex", md: "none" }, color: orange }}>
            <ChatIcon />
            <Typography variant="h6" fontWeight={700}>BuzzChat</Typography>
          </Stack>

          <AnimatePresence mode="wait">
            <motion.div
              key={forgotStep ? `forgot-${forgotStep}` : isLogin ? "login" : "signup"}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.75rem", sm: "2rem" }}>
                {forgotStep ? "Reset password" : isLogin ? "Welcome back" : "Create account"}
              </Typography>
              <Typography color="text.secondary" mt={0.5} mb={3}>
                {forgotStep === "email"
                  ? "Enter your account email and we'll send you a 6-digit code."
                  : forgotStep === "reset"
                    ? `Enter the code sent to ${email.value} and choose a new password.`
                    : isLogin ? "Log in to continue your conversations." : "Join BuzzChat in less than a minute."}
              </Typography>

              {forgotStep === "email" ? (
                <form onSubmit={handleForgot}>
                  <Stack spacing={2}>
                    {emailField}
                    {submitButton("Send code", "Sending code")}
                  </Stack>
                </form>
              ) : forgotStep === "reset" ? (
                <form onSubmit={handleReset}>
                  <Stack spacing={2}>
                    <TextField
                      required
                      fullWidth
                      label="6-digit code"
                      autoComplete="one-time-code"
                      value={otp.value}
                      onChange={otp.changeHandler}
                      sx={fieldSx}
                      inputProps={{ maxLength: 6, inputMode: "numeric", pattern: "[0-9]{6}" }}
                      InputProps={{ startAdornment: iconAdornment(PinIcon) }}
                    />
                    {passwordField}
                    {submitButton("Reset password", "Resetting password")}
                    <Typography textAlign="center" variant="body2" color="text.secondary">
                      Didn't get it?{" "}
                      <Box component="button" type="button" onClick={requestResetCode} disabled={isLoading} sx={linkButtonSx}>
                        Resend code
                      </Box>
                      {" · "}
                      <Box component="button" type="button" onClick={() => openForgot("email")} disabled={isLoading} sx={linkButtonSx}>
                        Change email
                      </Box>
                    </Typography>
                  </Stack>
                </form>
              ) : isLogin ? (
                <form onSubmit={handleLogin}>
                  <Stack spacing={2}>
                    {usernameField}
                    {passwordField}
                    <Box sx={{ textAlign: "right", mt: "8px !important" }}>
                      <Box component="button" type="button" onClick={() => openForgot("email")} disabled={isLoading} sx={{ ...linkButtonSx, fontSize: "0.875rem" }}>
                        Forgot password?
                      </Box>
                    </Box>
                    {submitButton("Log in", "Logging in")}
                  </Stack>
                </form>
              ) : (
                <form onSubmit={handleSignUp}>
                  <Stack spacing={2}>
                    <Stack alignItems="center" spacing={1}>
                      <Box sx={{ position: "relative" }}>
                        <Avatar
                          src={avatar.preview}
                          sx={{
                            width: 96,
                            height: 96,
                            bgcolor: "#f3f3f3",
                            color: "text.disabled",
                            border: `2px dashed ${avatarMissing || avatar.error ? "#d32f2f" : avatar.preview ? "transparent" : "#d0d0d0"}`,
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 44 }} />
                        </Avatar>
                        <IconButton
                          component="label"
                          aria-label="Upload profile photo"
                          size="small"
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            bgcolor: orange,
                            color: "white",
                            border: "3px solid white",
                            "&:hover": { bgcolor: accentDark },
                          }}
                        >
                          <CameraAltIcon sx={{ fontSize: 18 }} />
                          <VisuallyHiddenInput type="file" accept="image/*" onChange={avatarChangeHandler} />
                        </IconButton>
                      </Box>
                      <Typography
                        variant="caption"
                        color={avatarMissing || avatar.error ? "error" : "text.secondary"}
                      >
                        {avatar.error || (avatarMissing ? "Profile photo is required" : "Add a profile photo")}
                      </Typography>
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        required
                        fullWidth
                        label="First name"
                        autoComplete="given-name"
                        value={firstName.value}
                        onChange={firstName.changeHandler}
                        sx={fieldSx}
                        inputProps={{ maxLength: 50 }}
                        InputProps={{ startAdornment: iconAdornment(BadgeIcon) }}
                      />
                      <TextField
                        fullWidth
                        label="Last name"
                        autoComplete="family-name"
                        value={lastName.value}
                        onChange={lastName.changeHandler}
                        sx={fieldSx}
                        inputProps={{ maxLength: 50 }}
                      />
                    </Stack>
                    {emailField}
                    {usernameField}
                    <TextField
                      required
                      fullWidth
                      label="Bio"
                      placeholder="A few words about you"
                      multiline
                      maxRows={3}
                      value={bio.value}
                      onChange={bio.changeHandler}
                      sx={fieldSx}
                      InputProps={{ startAdornment: iconAdornment(NotesIcon) }}
                    />
                    {passwordField}
                    {submitButton("Create account", "Creating account")}
                  </Stack>
                </form>
              )}

              <Typography textAlign="center" color="text.secondary" mt={3}>
                {forgotStep ? "Remembered it?" : isLogin ? "New to BuzzChat?" : "Already have an account?"}{" "}
                <Box
                  component="button"
                  type="button"
                  onClick={forgotStep ? () => openForgot(null) : toggleLogin}
                  disabled={isLoading}
                  sx={linkButtonSx}
                >
                  {forgotStep || !isLogin ? "Log in" : "Create an account"}
                </Box>
              </Typography>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
      </Box>
    </Box>
  );
};

export default Login;
