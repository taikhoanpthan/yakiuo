import { useEffect } from "react";
import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";

const useSocket = (userId) => {
  useEffect(() => {
    if (!userId) return;

    connectSocket(userId);

    return () => {
      disconnectSocket();
    };
  }, [userId]);
};

export default useSocket;