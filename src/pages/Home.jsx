import { ChatBubbleRounded as ChatIcon, GroupAdd as GroupAddIcon, PersonSearch as PersonSearchIcon } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import React from 'react';
import { useDispatch } from 'react-redux';
import AppLayout from '../components/layout/AppLayout';
import { brandGradient } from '../constants/theme';
import { setIsNewGroup, setIsSearch } from '../redux/reducers/misc';

const Home = () => {
  const dispatch = useDispatch();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Stack alignItems="center" textAlign="center" spacing={2} maxWidth={380}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "24px",
            background: brandGradient,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 30px rgba(234,112,112,0.3)",
          }}
        >
          <ChatIcon sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h5" fontWeight={700}>Your messages</Typography>
        <Typography color="text.secondary">
          Pick a conversation from the list, or start something new.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} pt={1}>
          <Button variant="contained" startIcon={<PersonSearchIcon />} onClick={() => dispatch(setIsSearch(true))}>
            Find people
          </Button>
          <Button variant="outlined" startIcon={<GroupAddIcon />} onClick={() => dispatch(setIsNewGroup(true))}>
            New group
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default AppLayout()(Home);
