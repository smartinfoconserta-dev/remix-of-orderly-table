import { Navigate, useParams } from "react-router-dom";

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();

  return <Navigate to={id ? `/cliente?mesa=${id}` : "/cliente"} replace />;
};

export default MesaPage;
