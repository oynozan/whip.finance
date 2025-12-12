import { SocketAuthentication } from "./index";
import type { Socket, Server } from "socket.io";

// Listener imports
import { DataFeed } from "./data";
import { SocketPing } from "./socket-ping";
import { TradeListener } from "./trade";
import { ChartListener } from "./chart";
import { VaultListener } from "../lib/vaultListener";
import { EarningsListener } from "../lib/earningsListener";

export class SocketListeners {
    private io: Server;
    private vaultListener: VaultListener;
    private earningsListener: EarningsListener;

    constructor(io: Server) {
        this.io = io;

        // Start contract event listeners
        this.vaultListener = new VaultListener(io);
        this.vaultListener.start();

        this.earningsListener = new EarningsListener(io);
        this.earningsListener.start();

        this.protectedListeners();
        this.publicListeners();
    }

    protectedListeners() {
        const protectedIO = this.io.of("/protected");
        SocketAuthentication.serverOnlyAuthenticationMiddleware(protectedIO);

        // On-connection listeners
        protectedIO.on("connection", (socket: Socket) => {
            new SocketPing(protectedIO, socket).listen();
        });
    }

    publicListeners() {
        const publicIO = SocketAuthentication.authenticationMiddleware(this.io);

        // On-connection listeners
        publicIO.on("connection", (socket: Socket) => {
            new SocketPing(this.io, socket).listen();
            new DataFeed(this.io, socket).listen();
            new TradeListener(this.io, socket).listen();
            new ChartListener(this.io, socket).listen();
        });
    }
}
