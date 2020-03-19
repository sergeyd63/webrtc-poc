import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
// import { createServer, Server as HTTPSServer } from "https";

const path = require('path')
// const fs = require('fs')

interface User {
    socketId: string;
    name?: string;
}

export class Server {
    private theServer: HTTPServer;
    // private theServer: HTTPSServer
    private app: Application;
    private io: SocketIOServer;

    private activeSockets: string[] = [];

    private activeUsers: User[] = []

    private readonly DEFAULT_PORT = 5050;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        this.app = express();
        this.theServer = createServer(this.app);
        // this.theServer = createServer({
        //     key: fs.readFileSync('./src/key.pem'),
        //     cert: fs.readFileSync('./src/cert.pem'),
        //     passphrase: 'Opengl33'
        // }, this.app)
        this.io = socketIO(this.theServer);

        this.configureApp();
        this.configureRoutes();
        this.handleSocketConnection();
    }

    private configureApp(): void {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    private configureRoutes(): void {
        this.app.get("/", (req, res) => {
            res.sendFile("index.html");
        });
    }

    private handleSocketConnection(): void {
        this.io.on("connection", socket => {
            const existingSocket = this.activeSockets.find(
                existingSocket => existingSocket === socket.id
            );

            if (!existingSocket) {
                this.activeSockets.push(socket.id);
                this.activeUsers.push({
                    socketId: socket.id,
                    name: ''
                })

                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(
                        existingSocket => existingSocket !== socket.id
                    ),
                    userNames: this.activeUsers.filter(user => user.socketId !== socket.id)
                });

                socket.broadcast.emit("update-user-list", {
                    users: [socket.id],
                    userNames: [this.activeUsers.find(user => user.socketId === socket.id)]
                });
            }

            socket.on("username-update", (data: any) => {

                this.activeUsers[this.activeUsers.findIndex(user => user.socketId === data.socketId)].name = data.name
                console.log('username update', this.activeUsers)

                console.log('find', this.activeUsers.find(user => user.socketId === socket.id))
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id],
                    userNames: [this.activeUsers.find(user => user.socketId === socket.id)]
                });
            });

            socket.on("call-user", (data: any) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });

            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });

            socket.on("reject-call", data => {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });

            socket.on("disconnect", () => {
                this.activeSockets = this.activeSockets.filter(
                    existingSocket => existingSocket !== socket.id
                );
                this.activeUsers = this.activeUsers.filter(user => user.socketId !== socket.id)
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
            });

            socket.on("hangup-all", () => {
                console.log('hangup')
                socket.broadcast.emit("hang-up")
            })
        });
    }

    public listen(callback: (port: number) => void): void {
        this.theServer.listen(this.DEFAULT_PORT, () => {
            callback(this.DEFAULT_PORT);
        });
    }
}
