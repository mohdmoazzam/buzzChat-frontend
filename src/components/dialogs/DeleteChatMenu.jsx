import { ListItemIcon, Menu, MenuItem, Typography } from '@mui/material'
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
                vertical: "top",
                horizontal: "right"
            }}
            slotProps={{ paper: { sx: { borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" } } }}
        >
            <MenuItem
                onClick={isGroup ? leaveGroupHandler : deletChatHandler}
                sx={{ color: "error.main", minWidth: "11rem" }}
            >
                <ListItemIcon sx={{ color: "inherit" }}>
                    {isGroup ? <ExitToApp fontSize="small" /> : <Delete fontSize="small" />}
                </ListItemIcon>
                <Typography>{isGroup ? "Leave group" : "Delete chat"}</Typography>
            </MenuItem>
        </Menu>
    )
}

export default DeleteChatMenu