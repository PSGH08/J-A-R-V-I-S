// services/socket.js
// Socket.IO client connection for J.A.R.V.I.S. backend communication
import { io } from "socket.io-client";

export const socket = io("http://localhost:3001");