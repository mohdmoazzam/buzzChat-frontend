import {
  ArrowBackRounded as BackIcon,
  DeleteForeverOutlined as DeleteAccountIcon,
  DevicesOutlined as DevicesIcon,
  GroupsOutlined as GroupsIcon,
  LockOutlined as PasswordIcon,
  PersonOutline as PersonIcon,
} from "@mui/icons-material";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";
import { Link, NavLink } from "react-router-dom";

export const SETTINGS_SECTIONS = [
  { label: "Edit profile", path: "/settings/profile", Icon: PersonIcon },
  { label: "Password", path: "/settings/password", Icon: PasswordIcon },
  { label: "Devices", path: "/settings/devices", Icon: DevicesIcon },
  { label: "Manage groups", path: "/settings/groups", Icon: GroupsIcon },
  { label: "Delete account", path: "/settings/delete-account", Icon: DeleteAccountIcon },
];

const SettingsNav = ({ onSelect }) => (
  <Stack height="100%" sx={{ bgcolor: "#fff", px: 1.5, pt: 2 }}>
    <Stack direction="row" alignItems="center" spacing={0.5} mb={2}>
      <Tooltip title="Back to chats">
        <IconButton component={Link} to="/" onClick={onSelect} size="small" aria-label="Back to chats" sx={{ color: "text.secondary" }}>
          <BackIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Typography variant="h6" fontWeight={700}>Settings</Typography>
    </Stack>

    <Stack component="nav" spacing={0.25}>
      {SETTINGS_SECTIONS.map(({ label, path, Icon }) => (
        <Box
          key={path}
          component={NavLink}
          to={path}
          onClick={onSelect}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            height: 38,
            px: 1.25,
            borderRadius: "8px",
            textDecoration: "none",
            color: "text.secondary",
            fontSize: "0.9rem",
            fontWeight: 500,
            transition: "background-color 0.15s, color 0.15s",
            "&:hover": { bgcolor: "#f6f6f8", color: "text.primary" },
            "&.active": { bgcolor: "#f1f1f4", color: "text.primary", fontWeight: 600 },
          }}
        >
          <Icon sx={{ fontSize: 19 }} />
          {label}
        </Box>
      ))}
    </Stack>
  </Stack>
);

export default SettingsNav;
