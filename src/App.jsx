import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectRoute from './components/auth/ProtectRoute';
import { AppLoader } from './components/layout/Loaders';
import axios from 'axios';
import { server } from "./constants/config";
import { useDispatch, useSelector } from 'react-redux';
import { userExists, userNotExists } from './redux/reducers/auth';
import { Toaster } from "react-hot-toast";
import { SocketProvider } from './socket';
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Chat = lazy(() => import("./pages/Chat"));
const Group = lazy(() => import("./pages/Group"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const MessageManagement = lazy(() => import("./pages/admin/MessageManagement"));
const ChatManagement = lazy(() => import("./pages/admin/ChatManagement"));

const App = () => {

  const dispatch = useDispatch();

  const { user, loader, token } = useSelector(state => state.auth);

  useEffect(() => {
    axios.get(`${server}/api/v1/user/me`, {
      withCredentials: true,
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(({ data }) => dispatch(userExists(data.user)))
      .catch((err) => dispatch(userNotExists()));
  }, [token]);


  return (
    loader ? (<AppLoader />) :
      (<BrowserRouter>
        <Suspense fallback={<AppLoader />}>

          <Routes>

            <Route element={<SocketProvider><ProtectRoute user={user} /></SocketProvider>} >
              <Route path='/' element={<ProtectRoute user={user}><Home /></ProtectRoute>} />
              <Route path='/chat/:chatId' element={<Chat />} />
              <Route path='/groups' element={<Group />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='/profile/edit' element={<EditProfile />} />
            </Route>

            <Route path='/login' element={<ProtectRoute user={!user} redirect='/'><Login /></ProtectRoute>} />
            <Route path='/admin' element={<AdminLogin />} />
            <Route path='/admin/dashboard' element={<Dashboard />} />
            <Route path='/admin/users' element={<UserManagement />} />
            <Route path='/admin/chats' element={<ChatManagement />} />
            <Route path='/admin/messages' element={<MessageManagement />} />
            <Route path='*' element={<NotFound />} />

          </Routes>
        </Suspense>
        <Toaster position="bottom-center" />
      </BrowserRouter>
      )
  );
};

export default App