import { Box, Typography } from '@mui/material';
import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import { grayColor } from '../constants/color';
import EmojiPeopleTwoToneIcon from '@mui/icons-material/EmojiPeopleTwoTone';

const Home = () => {
  return (
    <Box
      bgcolor={grayColor}
      height={"123%"}
      borderRadius={"5px"}
      display="flex"
      flexDirection="column"
      alignItems="center"
    >
      <EmojiPeopleTwoToneIcon fontSize="large" style={{ marginTop: '1rem', justifyContent: "center" }} />
      <Typography p={"2rem"} variant='h5' textAlign={"center"}>
        Select a friend to chat
      </Typography>
    </Box>
  )
}

export default AppLayout()(Home);