import { useEffect, useState } from "react";
import { getMyPermissions } from "../services/system.service";
import { onSystemPermissionsChanged } from "../services/socket";

export const usePermissions = (user) => {
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    let active = true;
    const load = () => getMyPermissions()
      .then((response) => { if (active) setPermissions(response.data?.data?.permissions || []); })
      .catch(() => { if (active) setPermissions([]); });
    void load();
    const unsubscribe = onSystemPermissionsChanged(load);
    return () => { active = false; unsubscribe(); };
  }, [user?._id, user?.role]);

  return { permissions, can: (permission) => permissions.includes(permission) };
};
