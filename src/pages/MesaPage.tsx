import { Navigate, useParams } from "react-router-dom";

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();

  return <Navigate to={id ? `/garcom?mesa=${id}` : "/garcom"} replace />;
};

export default MesaPage;
