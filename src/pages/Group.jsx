import { Add as AddIcon, Delete as DeleteIcon, Done as DoneIcon, Edit as EditIcon, KeyboardBackspace as KeyboardBackspaceIcon, Menu as MenuIcon } from '@mui/icons-material';
import { Backdrop, Box, Button, Drawer, Grid, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import React, { Suspense, memo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AddMemberDialog from '../components/dialogs/AddMemberDialog';
import ConfirmDeleteDialog from '../components/dialogs/ConfirmDeleteDialog';
import { LayoutLoader } from '../components/layout/Loaders';
import AvatarCard from '../components/shared/AvatarCard';
import UserItem from '../components/shared/UserItem';
import { Link } from '../components/styles/StyledComponent';
import { bgGradient } from '../constants/color';
import { useAsyncMutation, useErrors } from '../hooks/hook';
import { useDeleteChatMutation, useGetChatDetailsQuery, useMyGroupsQuery, useRemoveGroupMemberMutation, useRenameGroupMutation } from '../redux/api/api';
import { setIsAddMember } from '../redux/reducers/misc';

const Group = () => {
  const chatId = useSearchParams()[0].get("group");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAddMember } = useSelector((state) => state.misc);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupNameUpdatedValue, setGroupNameUpdatedValue] = useState("");
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);
  const [members, setMembers] = useState([]);

  const myGroups = useMyGroupsQuery("");

  const groupDetails = useGetChatDetailsQuery({ chatId, populate: "true" }, { skip: !chatId });

  const [renameGroup, isLoadingGroupName] = useAsyncMutation(useRenameGroupMutation);

  const [removeMember] = useAsyncMutation(useRemoveGroupMemberMutation);

  const [deleteGroup, isLoadingDeleteGroup] = useAsyncMutation(useDeleteChatMutation);


  const errors = [
    {
      isError: myGroups.isError,
      error: myGroups.error
    },
    {
      isError: groupDetails.isError,
      error: groupDetails.error
    }
  ];

  useErrors(errors);

  useEffect(() => {
    if (groupDetails.data) {
      setGroupName(groupDetails.data.chat.name);
      setGroupNameUpdatedValue(groupDetails.data.chat.name);
      setMembers(groupDetails.data.chat.members);
      setIsEdit(false);
    }

    return () => {
      setGroupName("");
      setGroupNameUpdatedValue("");
      setMembers([]);
    }
  }, [groupDetails.data])

  const navigateBack = () => {
    navigate("/");
  };

  const handleMobile = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const updateGroupName = () => {
    setIsEdit(false);
    renameGroup("Updating group name...", { chatId, name: groupNameUpdatedValue });

  }

  const handleMobileClose = () => {
    setIsMobileMenuOpen(false);
  }

  const openConfirmDeleteHandler = () => {
    setConfirmDeleteDialog(true);

  };

  const closeConfirmDeleteHandler = () => {
    setConfirmDeleteDialog(false);
  }

  const onClickOpenAddMember = () => {
    dispatch(setIsAddMember(true));
  }

  const deleteHandler = () => {
    deleteGroup("Deleting group...", chatId);
    closeConfirmDeleteHandler();
    navigate("/groups");
  }

  const removeMemberHandler = (id) => {
    removeMember("Removing member...", { chatId, userId: id });
  };

  const IconBtns = () => (
    <>
      <Box sx={{
        display: {
          xs: "block",
          sm: "none",
          position: "fixed",
          right: "1rem",
          top: "1rem"
        }
      }}>
        <IconButton onClick={handleMobile}>
          <MenuIcon />
        </IconButton>
      </Box>

      <Tooltip title="back">
        <IconButton sx={{
          position: "absolute",
          top: "2rem",
          left: "2rem",
          bgcolor: "rgba(0,0,0,0.8)",
          color: "white",
          ":hover": {
            bgcolor: "rgba(0,0,0,0.7)"
          }
        }}
          onClick={navigateBack}
        >
          <KeyboardBackspaceIcon />
        </IconButton>
      </Tooltip>
    </>
  );

  const ButtonGroup = <Stack
    direction={{
      xs: "column-reverse",
      sm: "row",
    }}
    spacing={"1rem"}
    p={{
      xs: "0",
      sm: "1rem",
      md: "1rem 4rem"
    }}
  >
    <Button size="large" color="error" startIcon={<DeleteIcon />} onClick={openConfirmDeleteHandler}>Delete Group</Button>
    <Button size="large" variant="contained" startIcon={<AddIcon />} onClick={onClickOpenAddMember}>Add Member</Button>

  </Stack>


  const GroupName = <Stack direction={"row"} alignItems={"center"} justifyContent={"center"} spacing={"1rem"} padding={"3rem"}>
    {
      isEdit ? (
        <>
          <TextField value={groupNameUpdatedValue} onChange={(e) => setGroupNameUpdatedValue(e.target.value)} />
          <IconButton onClick={updateGroupName} disabled={isLoadingGroupName}><DoneIcon /></IconButton>
        </>
      ) : (
        <>
          <Typography variant='h4'>{groupName}</Typography>
          <IconButton onClick={() => setIsEdit(true)}><EditIcon /></IconButton>
        </>
      )
    }
  </Stack>

  return myGroups.isLoading ? <LayoutLoader /> : (
    <Grid container height={"100vh"}>
      <Grid item sm={4} sx={{ display: { xs: "none", sm: "block" }, backgroundImage: bgGradient }}>
        <GroupList myGroups={myGroups.data?.groups} chatId={chatId} />
      </Grid>
      <Grid item xs={12} sm={8} sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        padding: "1rem 3rem"
      }}>
        <IconBtns />
        {
          groupName && <>
            {GroupName}
            <Typography margin={"2rem"} alignSelf={"flex-start"} variant="body1">
              Members
            </Typography>
            <Stack maxWidth={"45rem"} width={"100%"} boxSizing={"border-box"}
              padding={{
                sm: "1rem",
                xs: "0",
                md: "1rem 4rem"
              }}
              spacing={"2rem"}
              height={"70vh"}
              overflow={"auto"}
            >
              {/* Members */}
              {
                members.map((user, index) => (
                  <UserItem key={index} user={user} isAdded styling={{
                    boxShadow: "0 0 0.5rem rgba(0,0,0,0.2)",
                    padding: "1rem 2rem",
                    borderRadius: "1rem"
                  }}
                    handler={removeMemberHandler}
                  />
                ))
              }
            </Stack>
            {ButtonGroup}
          </>
        }
      </Grid>
      {
        isAddMember && (
          <Suspense fallback={<Backdrop open />}>
            <AddMemberDialog chatId={chatId} />
          </Suspense>
        )
      }

      {
        confirmDeleteDialog && (<Suspense fallback={<Backdrop open />}>
          <ConfirmDeleteDialog
            open={confirmDeleteDialog}
            handleClose={closeConfirmDeleteHandler}
            deleteHandler={deleteHandler}
          />
        </Suspense>
        )
      }
      <Drawer sx={{
        display: {
          xs: "block",
          sm: "none"
        }
      }}
        open={isMobileMenuOpen}
        onClose={handleMobileClose}
      >
        <GroupList w={"50vw"} myGroups={myGroups.data?.groups} chatId={chatId} />
      </Drawer>
    </Grid>
  )
};

const GroupList = ({ w = "100%", myGroups = [], chatId }) => (
  <Stack width={w}>
    {
      myGroups?.length > 0 ? (
        myGroups.map((group) => <GroupListItem group={group} chatId={chatId} key={group._id} />)
      ) : (
        <Typography textAlign={"center"} padding={"1rem"}>No groups</Typography>
      )
    }
  </Stack>
);

const GroupListItem = memo(({ group, chatId }) => {
  const { name, avatar, _id } = group;
  return (
    <Link to={`?group=${_id}`} onClick={e => { if (chatId === _id) e.preventDefault(); }}>
      <Stack direction={"row"} spacing={"1rem"} alignItems={"center"}>
        <AvatarCard avatar={avatar} />
        <Typography>{name}</Typography>
      </Stack>
    </Link>
  )
});

export default Group;