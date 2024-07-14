import { Avatar, Skeleton } from '@mui/material';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import AdminLayout from '../../components/layout/AdminLayout';
import Table from '../../components/shared/Table';
import { server } from '../../constants/config';
import { transformImage } from '../../lib/features';


const columns = [
  {
    field: "id",
    headerName: "ID",
    headerClassName: "table-header",
    width: 150
  },
  {
    field: "avatar",
    headerName: "Avatar",
    headerClassName: "table-header",
    width: 150,
    renderCell: (params) => (
      <Avatar alt={params.row.name} src={params.row.avatar} />
    )
  },
  {
    field: "name",
    headerName: "Name",
    headerClassName: "table-header",
    width: 200
  },
  {
    field: "username",
    headerName: "Username",
    headerClassName: "table-header",
    width: 200
  },
  {
    field: "friends",
    headerName: "Friends",
    headerClassName: "table-header",
    width: 150
  },
  {
    field: "groups",
    headerName: "Groups",
    headerClassName: "table-header",
    width: 150
  },
];


const UserManagement = () => {
  const { admin_token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${server}/api/v1/admin/users`, {
        headers: {
          Authorization: `${admin_token}`
        }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [server, admin_token]);

  useEffect(() => {
    if (data) {
      setRows(data?.data?.map((d) => ({
        ...d,
        id: d._id,
        avatar: transformImage(d.avatar, 50)
      })));
    }
  }, [data]);


  return (
    <AdminLayout>
      {
        loading ? (<Skeleton />) : (
          <Table heading={"All Users"} columns={columns} rows={rows} />
        )
      }
    </AdminLayout>
  )
}

export default UserManagement