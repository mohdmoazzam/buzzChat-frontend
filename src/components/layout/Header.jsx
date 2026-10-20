import {
  ChatBubbleRounded as ChatIcon,
  EditOutlined as EditIcon,
  PersonOutline as PersonIcon,
  GroupAddOutlined as AddIcon,
  GroupsOutlined as GroupIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  NotificationsNoneOutlined as NotificationsIcon,
  PersonSearchOutlined as SearchIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Backdrop,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { Suspense, forwardRef, lazy, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { server } from "../../constants/config";
import { brandGradient } from "../../constants/theme";
import { fullName, transformImage } from "../../lib/features";
import { userNotExists } from "../../redux/reducers/auth";
import { resetNotification } from "../../redux/reducers/chat";
import {
  setIsMobileMenu,
  setIsNewGroup,
  setIsNotification,
  setIsSearch,
} from "../../redux/reducers/misc";
const SearchDialog = lazy(() => import("../specific/Search"));
const NotificationDropdown = lazy(() => import("../specific/Notification"));
const NewGroupDialog = lazy(() => import("../specific/NewGroup"));

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isSearch, isNotification, isNewGroup } = useSelector(
    (state) => state.misc
  );
  const { notificationCount } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const bellRef = useRef(null);

  const handleMobile = () => {
    dispatch(setIsMobileMenu(true));
  };

  const openSearchDialog = () => {
    setAccountAnchor(null);
    dispatch(setIsSearch(true));
  };

  const openNewGroup = () => {
    setAccountAnchor(null);
    dispatch(setIsNewGroup(true));
  };

  const goTo = (path) => {
    setAccountAnchor(null);
    navigate(path);
  };

  const handleLogout = async () => {
    setAccountAnchor(null);
    try {
      await axios.get(`${server}/api/v1/user/logout`, { withCredentials: true });
    } catch (err) {
      // Still clear local session even if the request fails
    }
    dispatch(userNotExists());
    toast.success("Logged out successfully");
  };

  const openNotifications = () => {
    dispatch(setIsNotification(true));
    dispatch(resetNotification());
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          height: "4rem",
          px: { xs: 1, sm: 2.5 },
          display: "flex",
          alignItems: "center",
          bgcolor: "#fff",
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        {/* Content lines up with the centered app width on wide screens */}
        <Box sx={{ width: "100%", maxWidth: 1440, mx: "auto", height: "100%", display: "flex", alignItems: "center", "@media (min-width: 1441px)": { px: 2 } }}>
        <IconButton
          onClick={handleMobile}
          aria-label="Open chats"
          sx={{ display: { xs: "inline-flex", sm: "none" }, mr: 0.5 }}
        >
          <MenuIcon />
        </IconButton>

        <Stack
          component={Link}
          to="/"
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ textDecoration: "none", color: "text.primary" }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              background: brandGradient,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChatIcon sx={{ fontSize: 19 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ display: { xs: "none", sm: "block" } }}>
            BuzzChat
          </Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" alignItems="center" spacing={{ xs: 0, sm: 0.5 }}>
          <IconBtn
            ref={bellRef}
            title="Notifications"
            icon={<NotificationsIcon />}
            onClick={openNotifications}
            value={notificationCount}
          />

          <Tooltip title="Account">
            <IconButton onClick={(e) => setAccountAnchor(e.currentTarget)} sx={{ ml: { xs: 0.5, sm: 1 } }}>
              <Avatar src={transformImage(user?.avatar?.url)} sx={{ width: 34, height: 34 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        </Box>
      </Box>

      <Menu
        anchorEl={accountAnchor}
        open={Boolean(accountAnchor)}
        onClose={() => setAccountAnchor(null)}
        disableScrollLock
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography fontWeight={600} noWrap>{fullName(user)}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>@{user?.username}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => goTo("/profile")} sx={{ mt: 0.5 }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => goTo("/profile/edit")}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={openSearchDialog}>
          <ListItemIcon>
            <SearchIcon fontSize="small" />
          </ListItemIcon>
          Find people
        </MenuItem>
        <MenuItem onClick={openNewGroup}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          New group
        </MenuItem>
        <MenuItem onClick={() => goTo("/groups")}>
          <ListItemIcon>
            <GroupIcon fontSize="small" />
          </ListItemIcon>
          Manage groups
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>

      {isSearch && (
        <Suspense fallback={<Backdrop open />}>
          <SearchDialog />
        </Suspense>
      )}

      {isNotification && (
        <Suspense fallback={null}>
          <NotificationDropdown anchorEl={bellRef.current} />
        </Suspense>
      )}

      {isNewGroup && (
        <Suspense fallback={<Backdrop open />}>
          <NewGroupDialog />
        </Suspense>
      )}
    </>
  );
};

const IconBtn = forwardRef(({ title, icon, onClick, value }, ref) => {
  return (
    <Tooltip title={title}>
      <IconButton ref={ref} onClick={onClick} aria-label={title} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
        {value ? (
          <Badge badgeContent={value} color="primary">
            {icon}
          </Badge>
        ) : (
          icon
        )}
      </IconButton>
    </Tooltip>
  );
});

export default Header;
