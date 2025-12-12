import cookie from "cookie";
import jwt from "jsonwebtoken";
import type { Server as HTTPServer } from "http";
import { type Namespace, Server, type Socket } from "socket.io";

import UserDB from "../models/Users";
import { getKey } from "../lib/utils";
import { IUser } from "../models/Users";

export function socketServer(server: HTTPServer) {
    const io = new Server(server, {
        cors: { origin: "*" },
    });

    console.log("socket.io server is running");
    return io;
}

export abstract class SocketListener {
    protected io: Server | Namespace;
    protected socket: Socket;

    constructor(io: Server | Namespace, socket: Socket) {
        if (!io || !socket) {
            throw new Error("socket.io server or socket is not initialized");
        }

        this.io = io;
        this.socket = socket;
    }
}

export class SocketAuthentication {
    private static getToken(socket: Socket) {
        let token: string | undefined;

        const rawCookie = socket.handshake.headers.cookie;
        if (rawCookie) {
            const cookies = cookie.parse(rawCookie);
            if (cookies.session) token = cookies.session;
        }

        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
        }

        if (!token) {
            return false;
        }

        return token;
    }

    public static authenticationMiddleware(io: Server) {
        io.use(async (socket, next) => {
            try {
                const token = SocketAuthentication.getToken(socket);
                if (!token) return next();

                const secret = process.env.JWT_SECRET!;
                const decoded = jwt.verify(token, secret) as null | IUser;

                if (!decoded || !decoded?.username) return next(new Error("Forbidden"));

                // Get user object
                const user = await UserDB.findOne({ username: decoded.username });
                if (!user) {
                    return next(new Error("User not found"));
                }

                socket.user = user;
                next();
            } catch (e) {
                console.error(e);
                next(new Error("Forbidden"));
            }
        });
        return io;
    }

    public static serverOnlyAuthenticationMiddleware(io: Namespace) {
        io.use((socket, next) => {
            try {
                const token = SocketAuthentication.getToken(socket);
                if (!token) return next(new Error("Unauthorized"));

                jwt.verify(token, getKey(), {
                    algorithms: ["ES256"],
                    issuer: process.env.JWT_ISSUER!,
                });

                next();
            } catch (e) {
                console.error(e);
                next(new Error("Forbidden"));
            }
        });
        return io;
    }
}
