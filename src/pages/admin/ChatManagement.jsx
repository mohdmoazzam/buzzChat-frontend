import { Avatar, Skeleton, Stack } from '@mui/material';
import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import AvatarCard from '../../components/shared/AvatarCard';
import Table from '../../components/shared/Table';
import { server } from '../../constants/config';
import { useFetchData } from '6pp';
import { fullName, transformImage } from '../../lib/features';
import { useSelector } from 'react-redux';
import axios from 'axios';


const columns = [
  {
    field: "id",
    headerName: "ID",
    headerClassName: "table-header",
    width: 150
  },
  {
    field: "name",
    headerName: "Name",
    headerClassName: "table-header",
    width: 150
  },
  {
    field: "group_chat",
    headerName: "Group",
    headerClassName: "table-header",
    width: 100
  },
  {
    field: "avatar",
    headerName: "Avatar",
    headerClassName: "table-header",
    width: 150,
    renderCell: (params) => (
      <AvatarCard max={100} avatar={params.row.members} />
    )
  },
  {
    field: "total_members",
    headerName: "Total Members",
    headerClassName: "table-header",
    width: 120
  },
  {
    field: "members",
    headerName: "Members",
    headerClassName: "table-header",
    width: 400,
    renderCell: (params) => (
      <Avatar alt={params.row.name} src={params.row.avatar} />
    )
  },
  {
    field: "total_messages",
    headerName: "Total Messages",
    headerClassName: "table-header",
    width: 120
  },
  {
    field: "creator",
    headerName: "Created By",
    headerClassName: "table-header",
    width: 250,
    renderCell: (params) => (
      <Stack direction={"row"} alignItems={"center"} spacing={"1rem"}>
        <Avatar alt={params.row.creator.name} src={params.row.creator.avatar} />
        <span>{params.row.creator.name}</span>
      </Stack>
    )
  }
];



const ChatManagement = () => {
  const { admin_token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);

  const fetchChatsData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${server}/api/v1/admin/chats`, {
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
    fetchChatsData();
  }, []);

  useEffect(() => {
    if (data) {
      setRows(data?.data?.map((d) => ({
        ...d,
        avatar: d.avatar.map((a) => transformImage(a, 50)),
        members: d.members.map((m) => transformImage(m.avatar.url, 50)),
        creator: {
          name: fullName(d.creator),
          avatar: transformImage(d.creator.avatar.url, 50)
        }
      })));
    }
  }, [data]);


  return (
    <AdminLayout>
      {
        loading ? (
          <Skeleton />
        ) : (
          <Table heading={"All Chats"} columns={columns} rows={rows} />
        )
      }
    </AdminLayout>
  )
}
export default ChatManagement