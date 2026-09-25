import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getSystemStatus } from "../services/system.service";
import { onSystemFeaturesChanged } from "../services/socket";
import HamsterLoader from "../components/common/HamsterLoader";

const FeatureRoute = ({ feature, children }) => {
  const [features, setFeatures] = useState(null);

  useEffect(() => {
    let active = true;

    getSystemStatus()
      .then((response) => {
        if (active) setFeatures(response.data?.data?.features || {});
      })
      .catch(() => {
        if (active) setFeatures({});
      });

    const unsubscribe = onSystemFeaturesChanged(({ features: nextFeatures } = {}) => {
      if (active) setFeatures(nextFeatures || {});
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (features === null) {
    return <div className="flex min-h-[40vh] items-center justify-center"><HamsterLoader size="sm" /></div>;
  }

  return features[feature] === false ? <Navigate to="/dashboard" replace /> : children;
};

export default FeatureRoute;
