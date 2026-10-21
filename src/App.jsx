import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Routes, Route, useLocation } from "react-router-dom";
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
const Devices = lazy(() => import("./pages/Devices"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Notifications = lazy(() => import("./pages/Notifications"));

// Old /groups links (including ?group=) now live under settings
const GroupsRedirect = () => <Navigate to={`/settings/groups${useLocation().search}`} replace />;

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const MessageManagement = lazy(() => import("./pages/admin/MessageManagement"));
const ChatManagement = lazy(() => import("./pages/admin/ChatManagement"));

const App = () => {

  const dispatch = useDispatch();

  const { user, loader, token } = useSelector(state => state.auth);
  // Signed up but hasn't entered the emailed code: only /verify-email is open to them
  const verifiedUser = user?.email_verified_at ? user : null;
  const appRedirect = user ? '/verify-email' : '/login';

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

            {/* Guard outside the socket: the server refuses unverified sockets, which would log them out */}
            <Route element={<ProtectRoute user={verifiedUser} redirect={appRedirect}><SocketProvider><Outlet /></SocketProvider></ProtectRoute>} >
              <Route path='/' element={<ProtectRoute user={verifiedUser} redirect={appRedirect}><Home /></ProtectRoute>} />
              <Route path='/chat/:chatId' element={<Chat />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='/notifications' element={<Notifications />} />
              <Route path='/settings' element={<Navigate to='/settings/profile' replace />} />
              <Route path='/settings/profile' element={<EditProfile />} />
              <Route path='/settings/password' element={<ChangePassword />} />
              <Route path='/settings/devices' element={<Devices />} />
              <Route path='/settings/groups' element={<Group />} />
              <Route path='/settings/delete-account' element={<DeleteAccount />} />
              <Route path='/groups' element={<GroupsRedirect />} />
              <Route path='/profile/edit' element={<Navigate to='/settings/profile' replace />} />
              <Route path='/profile/devices' element={<Navigate to='/settings/devices' replace />} />
            </Route>

            <Route path='/login' element={<ProtectRoute user={!user} redirect='/'><Login /></ProtectRoute>} />
            <Route path='/verify-email' element={<ProtectRoute user={user && !verifiedUser} redirect={user ? '/' : '/login'}><VerifyEmail /></ProtectRoute>} />
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