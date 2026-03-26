import { Navigate, useParams } from "react-router-dom";

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();

  return <Navigate to={id ? `/tablet?mesa=${id}` : "/tablet"} replace />;
};

export default MesaPage;
