import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSystemStatus } from "../services/system.service";
import HamsterLoader from "../components/common/HamsterLoader";

const FeatureRoute = ({ feature, children }) => {
  const { data: features, isLoading } = useQuery({
    queryKey: ["system", "features"],
    queryFn: async () => (await getSystemStatus()).data?.data?.features || {},
  });

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><HamsterLoader size="sm" /></div>;
  }

  return features[feature] === false ? <Navigate to="/dashboard" replace /> : children;
};

export default FeatureRoute;
