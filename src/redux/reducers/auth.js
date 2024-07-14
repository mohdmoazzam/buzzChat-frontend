import { createSlice } from "@reduxjs/toolkit";
import { adminLogin, adminLogout, getAdmin } from "../thunks/admin";
import toast from "react-hot-toast";

const initialState = {
    user: null,
    isAdmin: false,
    loader: true,
    token: localStorage.getItem("access_token") ? localStorage.getItem("access_token") : null,
    admin_token: localStorage.getItem("admin_token") ? localStorage.getItem("admin_token") : null,
};

const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        userExists: (state, action) => {
            state.user = action.payload;
            state.loader = false;
        },
        setToken: (state, action) => {
            state.token = action.payload.access_token;
            localStorage.setItem('access_token', action.payload.access_token);
        },
        userNotExists: (state) => {
            state.user = null;
            state.loader = false;
            state.token = null;
            localStorage.removeItem('access_token');
        }
    },

    extraReducers: (builder) => {
        builder.addCase(adminLogin.fulfilled, (state, action) => {
            state.isAdmin = true;
            state.admin_token = action.payload.admin_token;
            localStorage.setItem("admin_token", action.payload.admin_token);
            toast.success(action.payload.message);
        })
            .addCase(adminLogin.rejected, (state, action) => {
                state.isAdmin = false;
                toast.error(action.error.message);
            })
            .addCase(getAdmin.fulfilled, (state, action) => {
                if (action.payload) state.isAdmin = true;
                else state.isAdmin = false;

            })
            .addCase(getAdmin.rejected, (state, action) => {
                state.isAdmin = false;
            })
            .addCase(adminLogout.fulfilled, (state, action) => {
                state.isAdmin = false;
                state.admin_token = null;
                localStorage.removeItem("admin_token");
                toast.success("Log out successfully");
            })
            .addCase(adminLogout.rejected, (state, action) => {
                state.isAdmin = true;
                toast.error(action.error.message);
            });
    }
});

export default authSlice.reducer;
export const { userExists, userNotExists, setToken } = authSlice.actions;