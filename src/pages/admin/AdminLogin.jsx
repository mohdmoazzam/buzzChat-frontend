import { useInputValidation } from "6pp";
import { Button, Container, Paper, TextField, Typography } from "@mui/material";
import React, { useEffect } from 'react';
import { Navigate } from "react-router-dom";
import { bgGradient } from "../../constants/color";
import { useDispatch, useSelector } from "react-redux";
import { adminLogin, getAdmin } from "../../redux/thunks/admin";

const AdminLogin = () => {

  const { admin_token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const secretKey = useInputValidation("");

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(adminLogin(secretKey.value));
  };

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  if (admin_token) return <Navigate to={"/admin/dashboard"} />

  return (
    <div style={{
      height: "100vh",
      backgroundImage: bgGradient
    }}>
      <Container
        component={"main"}
        maxWidth="xs"
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography variant='h5'> Admin Login </Typography>
          <form style={{ width: "100%", marginTop: "1rem" }} onSubmit={submitHandler}>
            <TextField required fullWidth label="Secret Key" type='password' margin='normal' variant='outlined' value={secretKey.value} onChange={secretKey.changeHandler} />
            <Button sx={{ marginTop: "1rem" }} variant='contained' fullWidth color='primary' type='submit'>Login</Button>
          </form>
        </Paper>
      </Container>
    </div>
  )
}

export default AdminLogin