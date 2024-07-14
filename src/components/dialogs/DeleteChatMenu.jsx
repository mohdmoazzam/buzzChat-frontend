import { Menu, Stack, Typography } from '@mui/material'
import React, { useEffect } from 'react'
import { useSelector } from 'react-redux';
import { setIsDeleteMenu } from '../../redux/reducers/misc';
import { Delete, ExitToApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAsyncMutation } from '../../hooks/hook';
import { useDeleteChatMutation, useLeaveGroupMutation } from '../../redux/api/api';

const DeleteChatMenu = ({ dispatch, deleteOptionAnchor }) => {
    const navigate = useNavigate();
    const { isDeleteMenu, selectedDeleteChat } = useSelector((state) => state.misc);

    const closeHandler = () => {
        dispatch(setIsDeleteMenu(false));
        deleteOptionAnchor.current = null;
    }

    const [deleteChat, _, deleteChatData] = useAsyncMutation(useDeleteChatMutation);

    const [leaveGroup, __, leaveGroupData] = useAsyncMutation(useLeaveGroupMutation);

    const isGroup = selectedDeleteChat.groupChat;

    const leaveGroupHandler = () => { 
        closeHandler();
        leaveGroup("Leaving group...", selectedDeleteChat.chatId);
    };

    const deletChatHandler = () => {
        closeHandler();
        deleteChat("Deleting chat...", selectedDeleteChat.chatId);
    };

    useEffect(() => {
        if (deleteChatData || leaveGroupData) {
            navigate("/");
        }
    }, [deleteChatData, leaveGroupData]);

    return (
        <Menu
            open={isDeleteMenu}
            onClose={closeHandler}
            anchorEl={deleteOptionAnchor.current}
            anchorOrigin={{
                vertical: "bottom",
                horizontal: "right"
            }}
            transformOrigin={{
                vertical: "center",
                horizontal: "center"
            }}
        >
            <Stack
                sx={{
                    width: "10rem",
                    padding: "0.5rem",
                    cursor: "pointer"
                }}
                direction={"row"}
                alignItems={"center"}
                spacing={"0.5rem"}
                onClick={isGroup ? leaveGroupHandler : deletChatHandler}
            >
                {
                    isGroup ? (
                        <>
                            <ExitToApp />
                            <Typography>Leave Group</Typography>
                        </>
                    ) : (
                        <>
                            <Delete />
                            <Typography>Delete Chat</Typography>
                        </>
                    )
                }
            </Stack>
        </Menu>
    )
}

export default DeleteChatMenu