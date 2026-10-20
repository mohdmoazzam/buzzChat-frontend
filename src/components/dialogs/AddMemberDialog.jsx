import {
    CheckRounded as CheckIcon,
    CloseRounded as CloseIcon,
    PersonSearchOutlined as EmptyIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Dialog,
    Divider,
    IconButton,
    InputBase,
    Skeleton,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { orange } from '../../constants/color';
import { transformImage } from '../../lib/features';
import { useAddGroupMembersMutation, useAvailableFriendsQuery } from '../../redux/api/api';
import { setIsAddMember } from '../../redux/reducers/misc';
import { ButtonLoader } from '../layout/Loaders';

const MAX_MEMBERS = 15;

const AddMemberDialog = ({ chatId, currentCount = 0 }) => {
    const dispatch = useDispatch();
    const { isAddMember } = useSelector((state) => state.misc);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const { isLoading, data } = useAvailableFriendsQuery(chatId);
    const [addMembers, { isLoading: isAdding }] = useAddGroupMembersMutation();

    const [selectedIds, setSelectedIds] = useState([]);
    const [filter, setFilter] = useState("");

    const friends = data?.data ?? [];
    const filteredFriends = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? friends.filter((f) => f.name?.toLowerCase().includes(q)) : friends;
    }, [friends, filter]);
    const slotsLeft = Math.max(0, MAX_MEMBERS - currentCount - selectedIds.length);

    const closeHandler = () => dispatch(setIsAddMember(false));

    const toggle = (id) => {
        setSelectedIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (slotsLeft === 0) {
                toast.error(`A group can have at most ${MAX_MEMBERS} members`);
                return prev;
            }
            return [...prev, id];
        });
    };

    const submitHandler = async () => {
        const response = await addMembers({ members: selectedIds, chatId });
        if (response.data) {
            toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"} added`);
            closeHandler();
        } else {
            toast.error(response.error?.data?.message || "Couldn't add members");
        }
    };

    return (
        <Dialog
            open={isAddMember}
            onClose={isAdding ? undefined : closeHandler}
            fullScreen={fullScreen}
            fullWidth
            maxWidth="xs"
            PaperProps={{ sx: { borderRadius: fullScreen ? 0 : "20px", height: fullScreen ? "100%" : "min(640px, 90vh)", maxWidth: fullScreen ? "100%" : 520 } }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                <Box>
                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Add people</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {slotsLeft} {slotsLeft === 1 ? "spot" : "spots"} left in this group
                    </Typography>
                </Box>
                <IconButton onClick={closeHandler} disabled={isAdding} aria-label="Close" sx={{ color: "text.secondary" }}>
                    <CloseIcon />
                </IconButton>
            </Stack>

            <Box sx={{ px: 2.5, pb: 1.5 }}>
                <InputBase
                    autoFocus
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search friends"
                    fullWidth
                    inputProps={{ "aria-label": "Search friends" }}
                    startAdornment={<SearchIcon sx={{ color: "text.disabled", mr: 1, fontSize: 20 }} />}
                    sx={{
                        bgcolor: "#f4f4f6",
                        borderRadius: "12px",
                        px: 1.5,
                        py: 0.9,
                        border: "1px solid transparent",
                        "&.Mui-focused": { bgcolor: "#fff", borderColor: orange, boxShadow: "0 0 0 4px rgba(234,112,112,0.15)" },
                    }}
                />
            </Box>

            <Divider />

            <Box className="custom-scrollbar" sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1 }}>
                {isLoading ? (
                    <Stack>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ px: 1, py: 1.25 }}>
                                <Skeleton variant="circular" width={40} height={40} />
                                <Skeleton width="50%" sx={{ flex: 1 }} />
                                <Skeleton variant="circular" width={22} height={22} />
                            </Stack>
                        ))}
                    </Stack>
                ) : friends.length === 0 ? (
                    <Stack alignItems="center" textAlign="center" spacing={1} sx={{ pt: 6, px: 3 }}>
                        <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "#f4f4f6", display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                            <EmptyIcon sx={{ color: "text.disabled" }} />
                        </Box>
                        <Typography fontWeight={600}>Everyone's already here</Typography>
                        <Typography variant="body2" color="text.secondary">All your friends are in this group.</Typography>
                    </Stack>
                ) : filteredFriends.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ pt: 4 }}>
                        No friends match "{filter.trim()}"
                    </Typography>
                ) : (
                    <Stack divider={<Divider sx={{ ml: "64px", mr: 1 }} />}>
                        {filteredFriends.map((friend) => {
                            const selected = selectedIds.includes(friend._id);
                            return (
                                <Box
                                    key={friend._id}
                                    component="button"
                                    type="button"
                                    role="checkbox"
                                    aria-checked={selected}
                                    onClick={() => toggle(friend._id)}
                                    sx={{
                                        all: "unset",
                                        boxSizing: "border-box",
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        px: 1,
                                        py: 1.1,
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        "&:hover": { bgcolor: "#f8f8fa" },
                                        "&:focus-visible": { outline: `2px solid ${orange}`, outlineOffset: -2 },
                                    }}
                                >
                                    <Avatar src={transformImage(friend.avatar)} sx={{ width: 40, height: 40 }} />
                                    <Typography fontWeight={selected ? 600 : 500} sx={{ flex: 1, minWidth: 0 }} noWrap>{friend.name}</Typography>
                                    <Box
                                        sx={{
                                            width: 22, height: 22, borderRadius: "50%", border: "2px solid",
                                            borderColor: selected ? orange : "#d4d4d8", bgcolor: selected ? orange : "transparent",
                                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                        }}
                                    >
                                        {selected && <CheckIcon sx={{ fontSize: 15 }} />}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Box>

            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap>
                    {selectedIds.length ? `${selectedIds.length} selected` : "Select friends to add"}
                </Typography>
                <Button
                    variant="contained"
                    onClick={submitHandler}
                    disabled={!selectedIds.length || isAdding}
                    sx={{ borderRadius: "999px", px: 2.5, minWidth: 110, ...(isAdding && { "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.85 } }) }}
                >
                    {isAdding ? <ButtonLoader label="Adding" /> : "Add"}
                </Button>
            </Stack>
        </Dialog>
    )
}

export default AddMemberDialog
