import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../components/layout/AppLayout";
import { ButtonLoader } from "../components/layout/Loaders";
import Title from "../components/shared/Title";
import { useChangePasswordMutation } from "../redux/api/api";

// Same limits as the server (PASSWORD_MIN / PASSWORD_MAX; bcrypt ignores bytes beyond 72)
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

const PasswordField = ({ label, value, onChange, autoComplete, error, helperText, autoFocus }) => {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      fullWidth
      required
      label={label}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      error={error}
      helperText={helperText}
      inputProps={{ maxLength: PASSWORD_MAX }}
      InputProps={{
        sx: { borderRadius: "12px" },
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              size="small"
              aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

const ChangePassword = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  // Errors show once the user has typed into the field, not on an empty form
  const [touched, setTouched] = useState({});
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const tooShort = next.length > 0 && next.length < PASSWORD_MIN;
  const sameAsCurrent = next.length > 0 && next === current;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current && next.length >= PASSWORD_MIN && !sameAsCurrent && confirm === next && !isLoading;

  const update = (field, setter) => (value) => {
    setter(value);
    setTouched((t) => ({ ...t, [field]: true }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const res = await changePassword({ current_password: current, new_password: next });
    if (res.error) {
      toast.error(res.error.data?.message || "Something went wrong");
      return;
    }
    toast.success(res.data.message);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTouched({});
  };

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Password · BuzzChat" />
      <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 4, sm: 7 }, maxWidth: 560 }}>
        <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.75rem", sm: "2.25rem" }}>
          Password
        </Typography>
        <Typography color="text.secondary" mt={0.5}>
          Change the password you log in with. Your other devices will be logged out; this one stays logged in.
        </Typography>

        <Stack component="form" onSubmit={submit} spacing={2.5} mt={{ xs: 4, sm: 5 }} noValidate>
          <PasswordField
            label="Current password"
            value={current}
            onChange={update("current", setCurrent)}
            autoComplete="current-password"
            autoFocus
          />
          <PasswordField
            label="New password"
            value={next}
            onChange={update("next", setNext)}
            autoComplete="new-password"
            error={touched.next && (tooShort || sameAsCurrent)}
            helperText={
              touched.next && sameAsCurrent
                ? "Choose a password different from your current one"
                : `At least ${PASSWORD_MIN} characters`
            }
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={update("confirm", setConfirm)}
            autoComplete="new-password"
            error={touched.confirm && mismatch}
            helperText={touched.confirm && mismatch ? "Passwords don't match" : " "}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              sx={{ borderRadius: "999px", px: 3, py: 1.1, minWidth: 180 }}
            >
              {isLoading ? <ButtonLoader label="Changing password" /> : "Change password"}
            </Button>
            <Typography variant="body2" color="text.secondary">
              Forgot it? Log out and use “Forgot password?” on the login screen.
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false, sidebar: "settings" })(ChangePassword);
