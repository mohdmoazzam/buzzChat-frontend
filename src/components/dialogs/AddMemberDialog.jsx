import { Button, Dialog, DialogTitle, Skeleton, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAsyncMutation } from '../../hooks/hook';
import { useAddGroupMembersMutation, useAvailableFriendsQuery } from '../../redux/api/api';
import { setIsAddMember } from '../../redux/reducers/misc';
import UserItem from "../shared/UserItem";

const AddMemberDialog = ({ chatId }) => {
    const dispatch = useDispatch();
    const { isAddMember } = useSelector((state) => state.misc);

    const { isLoading, data } = useAvailableFriendsQuery(chatId);

    const [selectedMembers, setSelectedMembers] = useState([]);

    const [addMember, isLoadingAddMember] = useAsyncMutation(useAddGroupMembersMutation);

    const selectMemberHandler = (id) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter((currElement) => currElement !== id) : [...prev, id]
        )
    };

    const addMemberSubmitHandler = () => {
        addMember("Adding members...", { members: selectedMembers, chatId });
        closeHandler();
    };


    const closeHandler = () => dispatch(setIsAddMember(false));

    return (
        <Dialog open={isAddMember} onClose={closeHandler}>
            <Stack p={"2rem"} width={"20rem"} spacing={"2rem"}>
                <DialogTitle textAlign={"center"}>Add Member</DialogTitle>
                <Stack spacing={"1rem"}>
                    {
                        isLoading ? <Skeleton /> :
                        data?.data?.length > 0 ? data?.data?.map((user, index) => (
                            <UserItem key={index} user={user} handler={selectMemberHandler} isAdded={selectedMembers.includes(user._id)} />
                        )) : <Typography textAlign={"center"}>No friends</Typography>
                    }
                </Stack>
                <Stack direction={"row"} alignItems={"center"} justifyContent={"space-evenly"}>
                    <Button color='error' onClick={closeHandler}>Cancel</Button>
                    <Button variant="contained" disabled={isLoadingAddMember || selectedMembers.length === 0} onClick={addMemberSubmitHandler}>Save</Button>
                </Stack>
            </Stack>
        </Dialog>
    )
}

export default AddMemberDialog