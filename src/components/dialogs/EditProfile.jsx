import { useFileHandler, useInputValidation } from '6pp';
import { CameraAlt } from '@mui/icons-material';
import { Avatar, Button, Dialog, DialogTitle, IconButton, Stack, TextField } from '@mui/material';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIsEditProfile } from '../../redux/reducers/misc';
import { VisuallyHiddenInput } from '../styles/StyledComponent';

const EditProfile = ({ userDetails }) => {
  const dispatch = useDispatch();
  const { isEditProfile } = useSelector((state) => state.misc);
  const avatar = useFileHandler("single");
  const name = useInputValidation("");
  const bio = useInputValidation("");

  const handleSave = () => {
    console.log(name.value);
    console.log(avatar.file);
  };

  const handleCancel = () => dispatch(setIsEditProfile(false));
  return (
    <Dialog open={isEditProfile} onClose={handleCancel}>
      <DialogTitle textAlign={"center"}>Edit Profile</DialogTitle>
      <Stack p={"2rem"} direction={"column"} width={"30rem"} height={"auto"} alignItems={"center"}>
        <Avatar sx={{ width: "10rem", height: "10rem", objectFit: "contain" }} src={avatar.preview || userDetails?.avatar?.url} />
        <IconButton sx={{
          position: "absolute",
          top: "218px",
          right: "153px",
          color: "white",
          bgcolor: "rgba(0, 0,0,0.5)",
          ":hover": {
            bgcolor: "rgba(0, 0,0,0.7)"
          }
        }}
          component="label"
        >
          <>
            <CameraAlt />
            <VisuallyHiddenInput type='file' onChange={avatar.changeHandler} />
          </>
        </IconButton>

        <TextField
          label="Name"
          defaultValue={userDetails?.name}
          variant="outlined"
          fullWidth
          margin="normal"
          onChange={name.changeHandler}
        />
        <TextField
          label="Username"
          defaultValue={userDetails?.username}
          variant="outlined"
          fullWidth
          margin="normal"
          disabled={true}
        />
        <TextField
          label="Bio"
          defaultValue={userDetails?.bio}
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          onChange={bio.changeHandler}
        />

        <Stack direction="row" spacing={2} mt={2}>
          <Button variant="contained" color="primary" onClick={handleSave}>
            Save
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}

export default EditProfile;