import {
  AddPhotoAlternateOutlined as AddCoverIcon,
  CalendarTodayOutlined as CalendarIcon,
  EditOutlined as EditIcon,
  PersonOutline as PersonIcon,
  PhoneOutlined as PhoneIcon,
} from "@mui/icons-material";
import { Avatar, Box, Button, ButtonBase, Stack, Typography } from "@mui/material";
import moment from "moment";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import PhotoViewer from "../components/shared/PhotoViewer";
import ProfileCover from "../components/shared/ProfileCover";
import Title from "../components/shared/Title";
import { fullName, transformImage } from "../lib/features";

// "Prefer not to say" is intentionally not shown publicly
const GENDER_LABELS = { male: "Male", female: "Female", other: "Other" };

const AVATAR_SIZE = { xs: 104, sm: 136 };
// How far the photo hangs down over the cover's bottom edge
const AVATAR_OVERLAP = { xs: "-52px", sm: "-68px" };

const Detail = ({ Icon, children }) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Icon sx={{ fontSize: 17 }} />
    <Typography variant="body2">{children}</Typography>
  </Stack>
);

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  // "photo" | "cover" | null: which image is open full size
  const [viewing, setViewing] = useState(null);
  const hasCover = !!user?.cover?.url;

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Profile · BuzzChat" />
      <Box sx={{ maxWidth: 820, mx: "auto" }}>
        <ProfileCover
          src={user?.cover?.url}
          height={{ xs: 150, sm: 220 }}
          onOpen={() => setViewing("cover")}
          sx={{ borderRadius: { xs: 0, md: "0 0 20px 20px" } }}
        >
          {!hasCover && (
            <Button
              component={Link}
              to="/settings/profile"
              size="small"
              startIcon={<AddCoverIcon />}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                borderRadius: "999px",
                px: 1.5,
                bgcolor: "rgba(255,255,255,0.85)",
                color: "text.primary",
                backdropFilter: "blur(6px)",
                "&:hover": { bgcolor: "#fff" },
              }}
            >
              Add cover
            </Button>
          )}
        </ProfileCover>

        <Box sx={{ px: { xs: 2.5, sm: 5 }, pb: 5 }}>
          {/* The photo overlaps the cover; Edit profile sits on the same line, to the right */}
          <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={2} sx={{ mt: AVATAR_OVERLAP }}>
            <ButtonBase
              onClick={() => user?.avatar?.url && setViewing("photo")}
              aria-label="View your photo"
              sx={{ borderRadius: "50%", flexShrink: 0 }}
            >
              <Avatar
                src={transformImage(user?.avatar?.url, 280)}
                sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE, border: "4px solid #fff", boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}
              />
            </ButtonBase>
            <Button
              component={Link}
              to="/settings/profile"
              variant="outlined"
              startIcon={<EditIcon />}
              sx={{ borderRadius: "999px", px: 2, mb: 1, borderColor: "#e4e4e7", color: "text.primary", bgcolor: "#fff", "&:hover": { borderColor: "#d4d4d8", bgcolor: "#fafafa" } }}
            >
              Edit profile
            </Button>
          </Stack>

          <Typography
            variant="h4"
            fontWeight={700}
            fontSize={{ xs: "1.6rem", sm: "2rem" }}
            lineHeight={1.2}
            mt={2}
            sx={{ wordBreak: "break-word" }}
          >
            {fullName(user)}
          </Typography>
          <Typography color="text.secondary" fontSize="1rem" mt={0.25}>@{user?.username}</Typography>

          <Typography
            mt={2}
            fontSize="1rem"
            lineHeight={1.6}
            sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: user?.bio ? "text.primary" : "text.disabled" }}
          >
            {user?.bio || "You haven't added a bio yet."}
          </Typography>

          <Stack direction="row" alignItems="center" columnGap={2.5} rowGap={0.75} mt={2} flexWrap="wrap" color="text.secondary">
            {GENDER_LABELS[user?.gender] && <Detail Icon={PersonIcon}>{GENDER_LABELS[user.gender]}</Detail>}
            {user?.phone && <Detail Icon={PhoneIcon}>{user.phone}</Detail>}
            <Detail Icon={CalendarIcon}>Joined {user?.created_at ? moment(user.created_at).format("MMMM YYYY") : "—"}</Detail>
          </Stack>
        </Box>
      </Box>

      <PhotoViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        src={viewing === "cover" ? user?.cover?.url : user?.avatar?.url}
        title={fullName(user)}
      />
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false })(Profile);
