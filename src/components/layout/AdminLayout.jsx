import { Close as CloseIcon, Dashboard as DashboardIcon, ExitToApp as ExitToAppIcon, Groups as GroupsIcon, ManageAccounts as ManageAccountsIcon, Menu as MenuIcon, Message as MessageIcon } from '@mui/icons-material';
import { Box, Drawer, Grid, IconButton, Stack, Typography, styled } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as LinkComponent, useLocation, useNavigate } from 'react-router-dom';
import { matBlack } from '../../constants/color';
import { adminLogout } from '../../redux/thunks/admin';

const Link = styled(LinkComponent)`
  text-decoration: none;
  border-radius: 2rem;
  padding: 1rem 2rem;
  color: black;
  &:hover {
    color: rgba(0,0,0,0.54)
  }
`;


const adminTabs = [
    {
        name: "Dashboard",
        path: "/admin/dashboard",
        icon: <DashboardIcon />
    },
    {
        name: "Users",
        path: "/admin/users",
        icon: <ManageAccountsIcon />
    },
    {
        name: "Chats",
        path: "/admin/chats",
        icon: <GroupsIcon />
    },
    {
        name: "Messages",
        path: "/admin/messages",
        icon: <MessageIcon />
    },
];

const Sidebar = ({ w }) => {
    
    const location = useLocation();
    const dispatch = useDispatch();

    const logoutHandler = () => {
        dispatch(adminLogout());
    };


    return (
        <Stack width={w} direction={"column"} p={"3rem"} spacing={"3rem"}>
            <Typography variant="h5" textTransform={"uppercase"} textAlign={"center"}>BuzzChat</Typography>
            <Stack spacing={"1rem"}>
                {
                    adminTabs.map((tab) => (
                        <Link key={tab.path} to={tab.path}
                            sx={location.pathname === tab.path && {
                                bgcolor: matBlack,
                                color: "white",
                                ":hover": { color: "white" }
                            }}
                        >
                            <Stack direction={"row"} alignItems={"center"} spacing={"1rem"}>
                                {tab.icon}
                                <Typography>{tab.name}</Typography>
                            </Stack>
                        </Link>
                    ))
                }

                <Link onClick={logoutHandler}>
                    <Stack direction={"row"} alignItems={"center"} spacing={"1rem"}>
                        <ExitToAppIcon/>
                        <Typography>Logout</Typography>
                    </Stack>
                </Link>
            </Stack>
        </Stack>
    )
};


const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const { admin_token } = useSelector((state) => state.auth);
    const [isMobile, setIsMobile] = useState(false);
    const handleMobile = () => {
        setIsMobile(!isMobile);
    };


    const handleClose = () => setIsMobile(false);

    useEffect(() => {
        if (!admin_token) {
            navigate('/admin');
        }
    }, [admin_token, navigate]);

    return (
        <Grid container minHeight={"100vh"}>

            <Box
                sx={{
                    display: { xs: "block", md: "none" },
                    position: "fixed",
                    right: "1rem",
                    top: "1rem"
                }}
            >
                <IconButton onClick={handleMobile}>
                    {
                        isMobile ? <CloseIcon /> : <MenuIcon />
                    }
                </IconButton>
            </Box>
            <Grid item md={4} lg={3} sx={{ display: { xs: "none", md: "block" } }}>
                <Sidebar />
            </Grid>

            <Grid item xs={12} md={8} lg={9} sx={{ bgcolor: "#f5f5f5" }}>
                {children}
            </Grid>
            <Drawer open={isMobile} onClose={handleClose}>
                <Sidebar w="50vw" />
            </Drawer>
        </Grid>
    )
}

export default AdminLayout