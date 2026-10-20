import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { server } from "../../constants/config";


const api = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: `${server}/api/v1/`,
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.token;
            if (token) {
                headers.set("Authorization", `Bearer ${token}`);
            }
        }
    }),
    tagTypes: ["Chat"],
    endpoints: (builder) => ({
        myChats: builder.query({
            query: () => ({
                url: "chat/my", credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        searchUser: builder.query({
            query: (name) => ({
                url: `user/search?name=${name}`, credentials: "include"
            }),
        }),

        sendFriendRequest: builder.mutation({
            query: (data) => ({
                url: "user/sendRequest",
                method: "POST",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
        }),

        acceptFriendRequest: builder.mutation({
            query: (data) => ({
                url: "user/acceptRequest",
                method: "PUT",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
        }),

        getNotifications: builder.query({
            query: () => ({
                url: `user/myNotifications`, credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        getChatDetails: builder.query({
            query: ({ chatId, populate = false }) => {
                let url = `chat/${chatId}`;
                if (populate) url += "?populate=true";
                return {
                    url: url, credentials: "include"
                }
            },
           providesTags: ["Chat"]
        }),

        getChatMessages: builder.query({
            query: ({ chatId, page }) => ({
                url: `chat/message/${chatId}?page=${page}`,
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        sendAttachments: builder.mutation({
            query: (data) => ({
                url: "chat/message",
                method: "POST",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
        }),

        myGroups: builder.query({
            query: () => ({
                url: "chat/my/groups",
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        availableFriends: builder.query({
            query: (chatId) => {
                let url = `user/myFriends`;
                if (chatId) url += `?chatId=${chatId}`;
                return {
                    url: url, credentials: "include"
                }
            },
            keepUnusedDataFor: 0,
        }),

        newGroup: builder.mutation({
            query: ({ name, members }) => ({
                url: "chat/new",
                method: "POST",
                credentials: "include",
                body: { name, members }
            }), 
            keepUnusedDataFor: 0,
        }),

        renameGroup: builder.mutation({
            query: ({ chatId, name }) => ({
                url: `chat/${chatId}`,
                method: "PUT",
                credentials: "include",
                body: { name }
            }),
            invalidatesTags: ["Chat"]
        }),

        removeGroupMember: builder.mutation({
            query: ({ chatId, userId }) => ({
                url: "chat/removeMember",
                method: "PUT",
                credentials: "include",
                body: { chatId, userId }
            }),
            invalidatesTags: ["Chat"]
        }),

        addGroupMembers: builder.mutation({
            query: ({ members, chatId }) => ({
                url: "chat/addMembers",
                method: "PUT",
                credentials: "include",
                body: { members, chatId }
            }),
            invalidatesTags: ["Chat"]
        }),

        deleteChat: builder.mutation({
            query: (chatId ) => ({
                url: `chat/${chatId}`,
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Chat"]
        }),

        leaveGroup: builder.mutation({
            query: (chatId ) => ({
                url: `chat/leave/${chatId}`,
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Chat"]
        }),

        checkUsername: builder.query({
            query: (username) => ({
                url: `user/check-username?username=${encodeURIComponent(username)}`,
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        updateProfile: builder.mutation({
            query: (data) => ({
                url: "user/me",
                method: "PUT",
                credentials: "include",
                body: data
            }),
        }),
    })
});

export default api;

export const {
    useMyChatsQuery,
    useLazySearchUserQuery,
    useSendFriendRequestMutation,
    useGetNotificationsQuery,
    useAcceptFriendRequestMutation,
    useGetChatDetailsQuery,
    useGetChatMessagesQuery,
    useSendAttachmentsMutation,
    useMyGroupsQuery,
    useAvailableFriendsQuery,
    useNewGroupMutation,
    useRenameGroupMutation,
    useRemoveGroupMemberMutation,
    useAddGroupMembersMutation,
    useDeleteChatMutation,
    useLeaveGroupMutation,
    useUpdateProfileMutation,
    useLazyCheckUsernameQuery
} = api;