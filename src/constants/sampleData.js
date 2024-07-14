export const sampleChats = [
    {
        avatar: ["https://www.w3schools.com/howto/img_avatar.png"],
        name: "John Doe",
        _id: "1",
        groupChat: false,
        members: ["1", "2"]
    },
    {
        avatar: ["https://www.w3schools.com/howto/img_avatar.png"],
        name: "John Boi",
        _id: "2",
        groupChat: false,
        members: ["1", "2"]
    }
]

export const sampleUsers = [
    {
        avatar: "https://www.w3schools.com/howto/img_avatar.png",
        name: "John Doe",
        _id: "1",

    },
    {
        avatar: "https://www.w3schools.com/howto/img_avatar.png",
        name: "John Boi",
        _id: "2",

    }
]

export const sampleNotifications = [
    {
        sender: {
            avatar: ["https://www.w3schools.com/howto/img_avatar.png"],
            name: "John Doe",
        },
        _id: "1",

    },
    {
        sender: {
            avatar: ["https://www.w3schools.com/howto/img_avatar.png"],
            name: "John Boi",
        },
        _id: "2",

    }
];

export const sampleMessage = [
    {
        attachments: [],
        content: "Some dummy message",
        _id: "jhcgdcvnvgdvbdvjdnhvudh",
        sender: {
            _id: "user._id",
            name: "Chaman"
        },
        chat: "chatId",
        createdAt: "2024-02-12T10:41:30.630Z"
    },
    {
        attachments: [
            {
                public_id: "asdsssa 2",
                url: "https://www.w3schools.com/howto/img_avatar.png"
            }
        ],
        content: "",
        _id: "jhcgdcvnvgdvbdvjdnhvudhavc",
        sender: {
            _id: "hjcbkdjc",
            name: "Chaman 2"
        },
        chat: "chatId",
        createdAt: "2024-02-12T10:41:30.630Z"
    }
];


export const dashboardData = {
    users: [
        {
            avatar: "https://www.w3schools.com/howto/img_avatar.png",
            name: "John Doe",
            _id: "1",
            username: "john_doe",
            friends: 20,
            groups: 5

        },
        {
            avatar: "https://www.w3schools.com/howto/img_avatar.png",
            name: "John Boi",
            _id: "2",
            username: "john_boi",
            friends: 2,
            groups: 1
        }
    ],
    messages: [
        {
            attachments:[],
            content: "Ye mera message hai",
            _id: "1",
            sender:{
                avatar: "https://www.w3schools.com/howto/img_avatar.png",
                name:"Chaman"
            },
            chat:"chatId",
            groupChat: false,
            createdAt:"2024-02-12T10:41:30.630Z"
        },
        {
            attachments:[{
                publicId:"asdad2",
                url:"https://www.w3schools.com/howto/img_avatar.png"
            }],
            content: "",
            _id: "2",
            sender:{
                avatar: "https://www.w3schools.com/howto/img_avatar.png",
                name:"Chaman 2"
            },
            chat:"chatId",
            groupChat: true,
            createdAt:"2024-02-12T10:41:30.630Z"
        }
    ]
}