import { BiotechOutlined, CalendarMonth as CalendarIcon, Edit, Face as FaceIcon, AlternateEmail as UsernameIcon } from "@mui/icons-material";
import { Avatar, Backdrop, Stack, Tooltip, Typography } from '@mui/material';
import moment from 'moment';
import React, { Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { transformImage } from '../../lib/features';
import { setIsEditProfile } from '../../redux/reducers/misc';
import EditProfile from "../dialogs/EditProfile";
import { useFileHandler } from "6pp";

const Profile = ({ user }) => {
    const dispatch = useDispatch();
    const { isEditProfile } = useSelector((state) => state.misc);
    console.log("Profile", isEditProfile)
    const openEditProfileModal = () => dispatch(setIsEditProfile(true));
    const avatar = useFileHandler("single");

    return (
        <>
            <Stack spacing={"2rem"} direction={"column"} alignItems={"center"} sx={{ overflowY: "auto" }}>
                <Tooltip title="Edit Profile">
                    <Edit sx={{ cursor: "pointer", color: "white", fontSize: "25px" }} onClick={openEditProfileModal} />
                </Tooltip>

                <Avatar
                    src={transformImage(user?.avatar?.url)}
                    sx={{
                        width: 200,
                        height: 200,
                        objectFit: "contain",
                        marginBottom: "1rem",
                        border: "5px solid white"
                    }}
                />
                <ProfileCard heading={"Bio"} text={user?.bio || "Not available"} Icon={<BiotechOutlined />} />
                <ProfileCard heading={"Username"} text={user?.username} Icon={<UsernameIcon />} />
                <ProfileCard heading={"Name"} text={user?.name} Icon={<FaceIcon />} />
                <ProfileCard heading={"Joined"} text={moment(user?.createdAt).fromNow()} Icon={<CalendarIcon />} />
            </Stack>
            {
                isEditProfile && (
                    <Suspense fallback={<Backdrop open />}>
                        <EditProfile userDetails={user}/>
                    </Suspense>
                )
            }
        </>
    )
}

const ProfileCard = ({ text, Icon, heading }) => (
    <Stack direction={"row"}
        alignItems={"center"}
        spacing={"1rem"}
        color={"white"}
        textAlign={"center"}
    >
        {Icon && Icon}
        <Stack >
            <Typography variant='body1'>{text}</Typography>
            <Typography color={"gray"} variant='body1'>{heading}</Typography>
        </Stack>
    </Stack>
)



export default Profile