import { useEffect, useState } from "react";
import socket from "../services/socket";

const SocketTest = () => {
  const [status, setStatus] = useState("Disconnected");

  useEffect(() => {
    const handleConnect = () => {
      console.log("🟢 Connected:", socket.id);
      setStatus("Connected");
    };

    const handleDisconnect = (reason) => {
      console.log("🔴 Disconnected:", reason);
      setStatus("Disconnected");
    };

    const handleConnectError = (error) => {
      console.error("❌ Socket error:", error.message);
      setStatus("Error");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h2>Socket.IO Test</h2>

      <p>
        Status:{" "}
        <strong>{status}</strong>
      </p>

      {socket.connected && (
        <p>
          Socket ID: {socket.id}
        </p>
      )}
    </div>
  );
};

export default SocketTest;