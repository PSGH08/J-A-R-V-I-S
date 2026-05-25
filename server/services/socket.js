// client/src/services/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001"; // Make sure this matches your server URL

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});