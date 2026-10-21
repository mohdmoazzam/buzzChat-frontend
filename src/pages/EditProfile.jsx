import {
  ArrowBack as ArrowBackIcon,
  CameraAltOutlined as CameraIcon,
  CheckCircleRounded as CheckIcon,
  ErrorRounded as ErrorIcon,
  PhoneOutlined as PhoneIcon,
  LockOutlined as LockIcon,
  DeleteOutlineRounded as DeleteIcon,
} from "@mui/icons-material";
import { Avatar, Box, Button, CircularProgress, Divider, IconButton, InputBase, Stack, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { ButtonLoader } from "../components/layout/Loaders";
import ProfileCover from "../components/shared/ProfileCover";
import Title from "../components/shared/Title";
import { VisuallyHiddenInput } from "../components/styles/StyledComponent";
import { orange } from "../constants/color";
import { transformImage } from "../lib/features";
import { useLazyCheckUsernameQuery, useUpdateProfileMutation, useUploadAssetsMutation } from "../redux/api/api";
import { userExists } from "../redux/reducers/auth";
import { USERNAME_REGEX, USERNAME_RULE_MESSAGE } from "../utils/validators";

const BIO_MAX = 160;
const MAX_AVATAR_MB = 5;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const usernameStatusUi = {
  checking: { color: "text.secondary", text: "Checking availability…" },
  available: { color: "#16a34a", text: "Username is available" },
  taken: { color: "error.main", text: "Username is already taken" },
  invalid: { color: "error.main", text: USERNAME_RULE_MESSAGE },
  error: { color: "error.main", text: "Couldn't check username. Try again." },
};

// Keep in sync with PHONE_REGEX in the backend constants
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const normalizePhone = (value) => value.replace(/[\s\-().]/g, "");

const SUCCESS = "#16a34a";
const softRing = "0 0 0 4px rgba(234, 112, 112, 0.15)";

// Outlined input with a soft focus ring
const fieldSx = (state) => {
  const borderColor = state === "error" ? "error.main" : state === "success" ? SUCCESS : "#e4e4e7";
  return {
    width: "100%",
    bgcolor: "#fff",
    borderRadius: "12px",
    px: 1.75,
    py: 1.1,
    fontSize: "0.975rem",
    border: "1px solid",
    borderColor,
    transition: "border-color 0.15s, box-shadow 0.15s",
    "&:hover": { borderColor: state ? borderColor : "#d4d4d8" },
    "&.Mui-focused": {
      borderColor: state === "error" ? "error.main" : state === "success" ? SUCCESS : orange,
      boxShadow: state === "error" ? "0 0 0 4px rgba(211,47,47,0.12)" : state === "success" ? "0 0 0 4px rgba(22,163,74,0.12)" : softRing,
    },
    "& textarea": { resize: "none" },
  };
};

// The round buttons on the cover band
const coverIconSx = { bgcolor: "rgba(255,255,255,0.8)", backdropFilter: "blur(6px)", color: "text.primary", "&:hover": { bgcolor: "#fff" } };

const Field = ({ label, htmlFor, aside, helper, helperColor = "text.secondary", children }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
      <Typography component="label" htmlFor={htmlFor} variant="body2" fontWeight={600}>
        {label}
      </Typography>
      {aside}
    </Stack>
    {children}
    {helper && (
      <Typography variant="caption" display="block" mt={0.75} sx={{ color: helperColor }}>
        {helper}
      </Typography>
    )}
  </Box>
);

const Section = ({ title, description, children }) => (
  <Box sx={{ py: { xs: 3, sm: 4 } }}>
    <Typography fontWeight={700} fontSize="1.05rem">{title}</Typography>
    <Typography variant="body2" color="text.secondary" mb={2.5}>{description}</Typography>
    <Stack spacing={2.5}>{children}</Stack>
  </Box>
);

const EditProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  // Cover: a new file (with its preview), or removing the current one
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [touched, setTouched] = useState({ firstName: false, bio: false, phone: false });
  const [username, setUsername] = useState(user?.username ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  // unchanged | checking | available | taken | invalid | error
  const [usernameStatus, setUsernameStatus] = useState("unchanged");

  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [uploadAssets, { isLoading: isUploading }] = useUploadAssetsMutation();
  const isLoading = isSaving || isUploading;
  const [checkUsername] = useLazyCheckUsernameQuery();
  const latestCheck = useRef(0);

  useEffect(() => () => avatarPreview && URL.revokeObjectURL(avatarPreview), [avatarPreview]);
  useEffect(() => () => coverPreview && URL.revokeObjectURL(coverPreview), [coverPreview]);

  // Debounced availability check against the backend
  useEffect(() => {
    const value = username.trim();
    const checkId = ++latestCheck.current;

    if (value === user?.username) return setUsernameStatus("unchanged");
    if (!USERNAME_REGEX.test(value)) return setUsernameStatus("invalid");

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const data = await checkUsername(value).unwrap();
        if (checkId === latestCheck.current) setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        if (checkId === latestCheck.current) setUsernameStatus("error");
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [username, user?.username, checkUsername]);

  const nameError = !firstName.trim() ? "First name is required" : "";
  const bioError = !bio.trim() ? "Bio is required" : "";
  const normalizedPhone = normalizePhone(phone);
  const phoneError = normalizedPhone && !PHONE_REGEX.test(normalizedPhone) ? "Enter a valid phone number (7–15 digits)" : "";
  const phoneChanged = normalizedPhone !== (user?.phone ?? "");
  const usernameChanged = username.trim() !== (user?.username ?? "");
  const usernameOk = usernameStatus === "unchanged" || usernameStatus === "available";
  const usernameBad = ["taken", "invalid", "error"].includes(usernameStatus);
  const isDirty =
    firstName.trim() !== (user?.first_name ?? "") ||
    lastName.trim() !== (user?.last_name ?? "") ||
    bio.trim() !== (user?.bio ?? "") ||
    usernameChanged ||
    gender !== (user?.gender ?? "") ||
    phoneChanged ||
    !!avatarFile ||
    !!coverFile ||
    coverRemoved;
  const canSave = isDirty && !nameError && !bioError && !phoneError && usernameOk && !isLoading;

  const avatarChangeHandler = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_AVATAR_MB}MB`);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const resetAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
  };

  const coverChangeHandler = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_AVATAR_MB}MB`);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverRemoved(false);
  };

  // Drops a new cover if one was picked, otherwise marks the saved one for removal
  const removeCover = () => {
    if (coverFile) {
      setCoverFile(null);
      setCoverPreview("");
      return;
    }
    setCoverRemoved(true);
  };

  const resetCover = () => {
    setCoverFile(null);
    setCoverPreview("");
    setCoverRemoved(false);
  };
  const hasCover = !!coverPreview || (!!user?.cover?.url && !coverRemoved);

  const discardChanges = () => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setBio(user?.bio ?? "");
    setUsername(user?.username ?? "");
    setGender(user?.gender ?? "");
    setPhone(user?.phone ?? "");
    setTouched({ firstName: false, bio: false, phone: false });
    resetAvatar();
    resetCover();
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, bio: true, phone: true });
    if (!canSave) return;

    const changes = {};
    if (firstName.trim() !== user?.first_name) changes.first_name = firstName.trim();
    if (lastName.trim() !== (user?.last_name ?? "")) changes.last_name = lastName.trim();
    if (bio.trim() !== user?.bio) changes.bio = bio.trim();
    if (usernameChanged) changes.username = username.trim();
    if (gender !== (user?.gender ?? "")) changes.gender = gender;
    if (phoneChanged) changes.phone = normalizedPhone;
    // A new photo is uploaded first; the profile then refers to it by id
    if (avatarFile) {
      const uploaded = await uploadAssets([avatarFile]);
      if (!uploaded.data) return toast.error(uploaded.error?.data?.message || "Couldn't upload your photo");
      changes.avatar_id = uploaded.data.assets[0].id;
    }
    if (coverFile) {
      const uploaded = await uploadAssets([coverFile]);
      if (!uploaded.data) return toast.error(uploaded.error?.data?.message || "Couldn't upload your cover");
      changes.cover_id = uploaded.data.assets[0].id;
    } else if (coverRemoved) {
      changes.cover_id = null;
    }

    const response = await updateProfile(changes);
    if (response.data) {
      dispatch(userExists(response.data.user));
      toast.success("Profile updated");
      navigate("/profile");
    } else {
      if (response.error?.status === 409) setUsernameStatus("taken");
      toast.error(response.error?.data?.message || "Could not update profile");
    }
  };

  const showNameError = touched.firstName && !!nameError;
  const showBioError = touched.bio && !!bioError;
  const showPhoneError = touched.phone && !!phoneError;
  const status = usernameStatusUi[usernameStatus];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, bgcolor: "#fff" }}>
      <Title title="Edit profile · BuzzChat" />
      <Box
        component="form"
        id="edit-profile-form"
        className="custom-scrollbar"
        onSubmit={submitHandler}
        noValidate
        sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {/* Header band: the cover image (or the gradient), changed in place */}
        <ProfileCover
          src={coverRemoved ? null : user?.cover?.url}
          preview={coverPreview}
          height={{ xs: 140, sm: 180 }}
        >
          <IconButton
            onClick={() => navigate("/profile")}
            aria-label="Back to profile"
            sx={{
              position: "absolute",
              top: 16,
              left: { xs: 16, sm: 40 },
              bgcolor: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(6px)",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 16, right: { xs: 16, sm: 40 } }}>
            {/* Icons only (labels in the tooltips and for screen readers) */}
            <Tooltip title={hasCover ? "Change cover" : "Add cover"}>
              <IconButton component="label" aria-label={hasCover ? "Change cover" : "Add cover"} sx={coverIconSx}>
                <CameraIcon fontSize="small" />
                <VisuallyHiddenInput type="file" accept="image/*" onChange={coverChangeHandler} />
              </IconButton>
            </Tooltip>
            {hasCover && (
              <Tooltip title="Remove cover">
                <IconButton onClick={removeCover} aria-label="Remove cover" sx={coverIconSx}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </ProfileCover>

        <Box sx={{ px: { xs: 2.5, sm: 6 } }}>
          {/* Identity row with overlapping avatar */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "flex-end" }}
            spacing={{ xs: 1.5, sm: 3 }}
            sx={{ mt: { xs: "-44px", sm: "-40px" } }}
          >
            <Box
              component="label"
              aria-label="Change profile photo"
              sx={{
                position: "relative",
                borderRadius: "50%",
                cursor: "pointer",
                flexShrink: 0,
                "&:hover .overlay, &:focus-within .overlay": { opacity: 1 },
              }}
            >
              <Avatar
                src={avatarPreview || transformImage(user?.avatar?.url, 240)}
                sx={{
                  width: { xs: 88, sm: 104 },
                  height: { xs: 88, sm: 104 },
                  border: "4px solid #fff",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
              />
              <Box
                className="overlay"
                sx={{
                  position: "absolute",
                  inset: 4,
                  borderRadius: "50%",
                  bgcolor: "rgba(0,0,0,0.45)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.15s",
                }}
              >
                <CameraIcon />
              </Box>
              <VisuallyHiddenInput type="file" accept="image/*" onChange={avatarChangeHandler} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={700} noWrap>Edit profile</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {avatarFile ? `New photo: ${avatarFile.name}` : "Update your photo and personal details"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ pb: { sm: 0.5 } }}>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<CameraIcon />}
                sx={{ borderRadius: "999px", borderColor: "#e4e4e7", color: "text.primary", "&:hover": { borderColor: "#d4d4d8", bgcolor: "#fafafa" } }}
              >
                Change photo
                <VisuallyHiddenInput type="file" accept="image/*" onChange={avatarChangeHandler} />
              </Button>
              {avatarFile && (
                <Button size="small" onClick={resetAvatar} sx={{ borderRadius: "999px", color: "text.secondary" }}>
                  Undo
                </Button>
              )}
            </Stack>
          </Stack>

          <Section title="Basic info" description="Your name and how people find you.">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} sx={{ "& > *": { flex: 1, minWidth: 0 } }}>
              <Field
                label="First name"
                htmlFor="profile-first-name"
                helper={showNameError ? nameError : null}
                helperColor="error.main"
              >
                <InputBase
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                  autoComplete="given-name"
                  placeholder="First name"
                  inputProps={{ maxLength: 50 }}
                  sx={fieldSx(showNameError ? "error" : null)}
                />
              </Field>
              <Field label="Last name" htmlFor="profile-last-name" aside={<Typography variant="caption" color="text.disabled">Optional</Typography>}>
                <InputBase
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  placeholder="Last name"
                  inputProps={{ maxLength: 50 }}
                  sx={fieldSx(null)}
                />
              </Field>
            </Stack>

            <Field
              label="Username"
              htmlFor="profile-username"
              helper={status ? status.text : USERNAME_RULE_MESSAGE}
              helperColor={status ? status.color : "text.disabled"}
            >
              <InputBase
                id="profile-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                autoComplete="username"
                placeholder="username"
                inputProps={{ maxLength: 20, spellCheck: false, autoCapitalize: "none" }}
                startAdornment={
                  <Typography component="span" color="text.disabled" sx={{ mr: 0.5, userSelect: "none" }}>@</Typography>
                }
                endAdornment={
                  <Box sx={{ display: "flex", ml: 1 }}>
                    {usernameStatus === "checking" && <CircularProgress size={16} sx={{ color: "text.disabled" }} />}
                    {usernameStatus === "available" && <CheckIcon sx={{ fontSize: 20, color: SUCCESS }} />}
                    {usernameBad && <ErrorIcon sx={{ fontSize: 20, color: "error.main" }} />}
                  </Box>
                }
                sx={fieldSx(usernameBad ? "error" : usernameStatus === "available" ? "success" : null)}
              />
            </Field>

            {/* Shown for reference only: the email can't be changed here (it's what codes are sent to) */}
            <Field
              label="Email"
              htmlFor="profile-email"
              aside={<Typography variant="caption" color="text.disabled">Can't be changed</Typography>}
            >
              <InputBase
                id="profile-email"
                value={user?.email ?? ""}
                readOnly
                inputProps={{ "aria-readonly": true, tabIndex: -1 }}
                endAdornment={<LockIcon sx={{ fontSize: 18, color: "text.disabled", ml: 1 }} />}
                sx={{
                  ...fieldSx(null),
                  bgcolor: "#f6f6f8",
                  color: "text.secondary",
                  cursor: "default",
                  "&:hover": { borderColor: "transparent" },
                  "& input": { cursor: "default" },
                }}
              />
            </Field>
          </Section>

          <Divider />

          <Section title="About you" description="A short bio shown on your profile.">
            <Field
              label="Bio"
              htmlFor="profile-bio"
              helper={showBioError ? bioError : null}
              helperColor="error.main"
            >
              <Box sx={{ position: "relative" }}>
                <InputBase
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                  onBlur={() => setTouched((t) => ({ ...t, bio: true }))}
                  multiline
                  minRows={3}
                  maxRows={6}
                  placeholder="Tell people a little about yourself"
                  sx={{ ...fieldSx(showBioError ? "error" : null), pb: 3 }}
                />
                <Typography
                  variant="caption"
                  sx={{ position: "absolute", right: 14, bottom: 8, color: bio.length >= BIO_MAX ? "error.main" : "text.disabled", pointerEvents: "none" }}
                >
                  {bio.length}/{BIO_MAX}
                </Typography>
              </Box>
            </Field>
          </Section>

          <Divider />

          <Section title="Personal" description="Optional details. Leave blank if you prefer.">
            <Field
              label="Phone number"
              htmlFor="profile-phone"
              aside={<Typography variant="caption" color="text.disabled">Optional</Typography>}
              helper={showPhoneError ? phoneError : "Include your country code, e.g. +91 98765 43210"}
              helperColor={showPhoneError ? "error.main" : "text.disabled"}
            >
              <InputBase
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s\-()]/g, ""))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                autoComplete="tel"
                placeholder="+91 98765 43210"
                inputProps={{ inputMode: "tel", maxLength: 22 }}
                startAdornment={<PhoneIcon sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />}
                sx={fieldSx(showPhoneError ? "error" : null)}
              />
            </Field>

            <Field label="Gender">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap role="radiogroup" aria-label="Gender">
                {GENDER_OPTIONS.map((option) => {
                  const selected = gender === option.value;
                  return (
                    <Box
                      key={option.value}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setGender(selected ? "" : option.value)}
                      sx={{
                        font: "inherit",
                        fontSize: "0.9rem",
                        fontWeight: selected ? 600 : 500,
                        px: 2,
                        py: 0.9,
                        borderRadius: "999px",
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: selected ? orange : "#e4e4e7",
                        bgcolor: selected ? "rgba(234,112,112,0.08)" : "#fff",
                        color: selected ? "#c74e4e" : "text.primary",
                        boxShadow: selected ? softRing : "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        transition: "all 0.15s",
                        "&:hover": { borderColor: selected ? orange : "#d4d4d8" },
                        "&:focus-visible": { outline: "none", boxShadow: softRing, borderColor: orange },
                      }}
                    >
                      {selected && <CheckIcon sx={{ fontSize: 16 }} />}
                      {option.label}
                    </Box>
                  );
                })}
              </Stack>
            </Field>
          </Section>
        </Box>
      </Box>

      {/* Action bar */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ flexShrink: 0, px: { xs: 2.5, sm: 6 }, py: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "#fff" }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: isDirty ? orange : "#d4d4d8", flexShrink: 0 }} />
          <Typography variant="body2" color={isDirty ? "text.primary" : "text.disabled"} noWrap>
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </Typography>
        </Stack>
        {isDirty && (
          <Button onClick={discardChanges} disabled={isLoading} sx={{ borderRadius: "999px", color: "text.secondary" }}>
            Discard
          </Button>
        )}
        <Button
          type="submit"
          form="edit-profile-form"
          variant="contained"
          disabled={!canSave}
          sx={{
            borderRadius: "999px",
            px: 3,
            minWidth: 120,
            ...(isLoading && { "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.85 } }),
          }}
        >
          {isLoading ? <ButtonLoader label="Saving" /> : "Save changes"}
        </Button>
      </Stack>
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false, sidebar: "settings" })(EditProfile);
