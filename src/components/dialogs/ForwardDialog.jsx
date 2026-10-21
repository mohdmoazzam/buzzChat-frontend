import { SearchRounded as SearchIcon, SendRounded as SendIcon } from '@mui/icons-material';
import {
    Box, Button, Checkbox, Dialog, InputAdornment, InputBase, List, ListItemButton, Skeleton, Stack, Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { orange } from '../../constants/color';
import { accentDark } from '../../constants/theme';
import { useForwardMessageMutation, useForwardTargetsQuery } from '../../redux/api/api';
import AvatarCard from '../shared/AvatarCard';
import { ButtonLoader } from '../layout/Loaders';

// Same limit as the server (FORWARD_MAX_CHATS)
const FORWARD_MAX_CHATS = 5;
const SEARCH_DEBOUNCE_MS = 300;

const ForwardDialog = ({ open, handleClose, chatId, message }) => {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selected, setSelected] = useState([]);

    const { data, isLoading, isError } = useForwardTargetsQuery(debouncedSearch, { skip: !open });
    const [forwardMessage, { isLoading: isSending }] = useForwardMessageMutation();

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    // Start fresh each time it opens
    useEffect(() => {
        if (!open) return;
        setSearch("");
        setDebouncedSearch("");
        setSelected([]);
    }, [open]);

    const toggle = (id) => {
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((item) => item !== id);
            if (prev.length >= FORWARD_MAX_CHATS) {
                toast.error(`You can forward to up to ${FORWARD_MAX_CHATS} chats at a time`);
                return prev;
            }
            return [...prev, id];
        });
    };

    const submitHandler = async () => {
        if (!selected.length || !message) return;
        const res = await forwardMessage({ chatId, messageId: message.id, chat_ids: selected });
        if (res.data) {
            toast.success(res.data.message);
            handleClose();
        } else {
            toast.error(res.error?.data?.message || "Something went wrong");
        }
    };

    const chats = data?.chats ?? [];

    return (
        <Dialog
            open={open}
            onClose={isSending ? undefined : handleClose}
            PaperProps={{ sx: { borderRadius: "20px", width: "100%", maxWidth: 420, m: 2 } }}
        >
            <Stack spacing={1.5} sx={{ p: 3, pb: 1.5 }}>
                <Typography variant="h6" fontWeight={700}>Forward to…</Typography>
                <InputBase
                    autoFocus
                    placeholder="Search chats"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    startAdornment={
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: "text.disabled" }} />
                        </InputAdornment>
                    }
                    inputProps={{ "aria-label": "Search chats" }}
                    sx={{ bgcolor: "#f4f4f6", borderRadius: "999px", px: 1.5, py: 0.75 }}
                />
            </Stack>

            <List className="custom-scrollbar" sx={{ px: 1.5, height: 320, overflowY: "auto" }}>
                {isLoading ? (
                    [0, 1, 2, 3].map((i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ px: 1.5, py: 1 }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Skeleton width="50%" />
                        </Stack>
                    ))
                ) : isError ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>Couldn't load your chats</Typography>
                ) : chats.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>No chats found</Typography>
                ) : (
                    chats.map((chat) => {
                        const checked = selected.includes(chat.id);
                        return (
                            <ListItemButton
                                key={chat.id}
                                onClick={() => toggle(chat.id)}
                                sx={{ borderRadius: "12px", gap: 1.5, py: 1 }}
                            >
                                <AvatarCard avatar={chat.avatar} size={40} />
                                <Typography fontWeight={500} noWrap sx={{ flex: 1, minWidth: 0 }}>{chat.name}</Typography>
                                <Checkbox
                                    edge="end"
                                    checked={checked}
                                    tabIndex={-1}
                                    disableRipple
                                    inputProps={{ "aria-label": `Forward to ${chat.name}` }}
                                    sx={{ "&.Mui-checked": { color: orange } }}
                                />
                            </ListItemButton>
                        );
                    })
                )}
            </List>

            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {selected.length ? `${selected.length} selected` : `Choose up to ${FORWARD_MAX_CHATS} chats`}
                    </Typography>
                </Box>
                <Button onClick={handleClose} disabled={isSending} sx={{ borderRadius: "999px", color: "text.secondary" }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={submitHandler}
                    disabled={!selected.length || isSending}
                    endIcon={isSending ? null : <SendIcon />}
                    sx={{
                        borderRadius: "999px", px: 2.5, minWidth: 110, bgcolor: orange, boxShadow: "none",
                        "&:hover": { bgcolor: accentDark, boxShadow: "none" },
                    }}
                >
                    {isSending ? <ButtonLoader label="Forward" /> : "Forward"}
                </Button>
            </Stack>
        </Dialog>
    );
};

export default ForwardDialog;
