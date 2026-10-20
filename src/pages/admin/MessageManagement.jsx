import { Avatar, Box, Skeleton, Stack } from '@mui/material';
import axios from 'axios';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import AdminLayout from '../../components/layout/AdminLayout';
import RenderAttachment from "../../components/shared/RenderAttachment";
import Table from '../../components/shared/Table';
import { server } from '../../constants/config';
import { fileFormat, fullName, transformImage } from '../../lib/features';

const columns = [
  {
    field: "id",
    headerName: "ID",
    headerClassName: "table-header",
    width: 120
  },
  {
    field: "attachments",
    headerName: "Attachments",
    headerClassName: "table-header",
    width: 200,
    renderCell: (params) => {
      const { attachments } = params.row;
      return attachments?.length > 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column">
          {attachments?.map((i) => {
            const url = i.url;
            const file = fileFormat(url);
            return (
              <Box key={url} m={1}>
                <a href={url} download target="_blank" style={{ color: "black" }}>
                  <RenderAttachment file={file} url={url} />
                </a>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center">
          No Attachments
        </Box>
      );
    }
  },
  {
    field: "content",
    headerName: "Content",
    headerClassName: "table-header",
    width: 400
  },
  {
    field: "sender",
    headerName: "Sent By",
    headerClassName: "table-header",
    width: 200,
    renderCell: (params) => (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Avatar alt={params.row.sender.name} src={params.row.sender.avatar} />
        <span>{params.row.sender.name}</span>
      </Stack>
    )
  },
  {
    field: "chat_id",
    headerName: "Chat",
    headerClassName: "table-header",
    width: 100
  },
  {
    field: "group_chat",
    headerName: "Group",
    headerClassName: "table-header",
    width: 70
  },
  {
    field: "created_at",
    headerName: "Time",
    headerClassName: "table-header",
    width: 250
  },
];

const MessageManagement = () => {
  const { admin_token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);

  const fetchMessagesData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${server}/api/v1/admin/messages`, {
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
    fetchMessagesData();
  }, [admin_token]);


  useEffect(() => {
    setRows(data?.data?.map(i => ({
      ...i,
      sender: {
        name: fullName(i.sender),
        avatar: transformImage(i.sender.avatar.url, 50)
      },
      created_at: moment(i.created_at).format("MMMM Do YYYY, h:mm:ss a")
    })) ?? []
    )
  }, [data])
  return loading ? (
    <Skeleton />
  ) : (
    <AdminLayout>
      <Table heading={"All Messages"} columns={columns} rows={rows} rowHeight={150} />
    </AdminLayout>
  )
}

export default MessageManagement