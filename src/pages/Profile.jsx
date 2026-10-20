import { CalendarTodayOutlined as CalendarIcon, EditOutlined as EditIcon, PersonOutline as PersonIcon, PhoneOutlined as PhoneIcon } from "@mui/icons-material";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import moment from "moment";
import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Title from "../components/shared/Title";
import { fullName, transformImage } from "../lib/features";

// "Prefer not to say" is intentionally not shown publicly
const GENDER_LABELS = { male: "Male", female: "Female", other: "Other" };

const Profile = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <Box className="custom-scrollbar" sx={{ height: "100%", overflowY: "auto", bgcolor: "#fff" }}>
      <Title title="Profile · BuzzChat" />
      <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 4, sm: 7 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2.5, sm: 4 }} alignItems={{ xs: "flex-start", sm: "center" }}>
          <Avatar
            src={transformImage(user?.avatar?.url, 280)}
            sx={{ width: { xs: 96, sm: 128 }, height: { xs: 96, sm: 128 } }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.75rem", sm: "2.25rem" }} lineHeight={1.15} sx={{ wordBreak: "break-word" }}>
              {fullName(user)}
            </Typography>
            <Typography color="text.secondary" fontSize="1.05rem" mt={0.5}>@{user?.username}</Typography>
            <Stack direction="row" alignItems="center" columnGap={2.5} rowGap={0.5} mt={1.5} flexWrap="wrap" color="text.secondary">
              {GENDER_LABELS[user?.gender] && (
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <PersonIcon sx={{ fontSize: 17 }} />
                  <Typography variant="body2">{GENDER_LABELS[user.gender]}</Typography>
                </Stack>
              )}
              {user?.phone && (
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <PhoneIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">{user.phone}</Typography>
                </Stack>
              )}
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <CalendarIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  Joined {user?.created_at ? moment(user.created_at).format("MMMM YYYY") : "—"}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Button
            component={Link}
            to="/profile/edit"
            variant="contained"
            startIcon={<EditIcon />}
            sx={{ borderRadius: "999px", px: 2.5, alignSelf: { xs: "stretch", sm: "center" } }}
          >
            Edit profile
          </Button>
        </Stack>

        <Box sx={{ mt: { xs: 4, sm: 6 } }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600} letterSpacing="0.08em">
            About
          </Typography>
          <Typography
            fontSize="1.1rem"
            lineHeight={1.6}
            mt={0.5}
            sx={{ wordBreak: "break-word", color: user?.bio ? "text.primary" : "text.disabled" }}
          >
            {user?.bio || "You haven't added a bio yet."}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout({ showListOnMobile: false })(Profile);
