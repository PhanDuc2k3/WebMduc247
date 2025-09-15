import { Outlet } from "react-router-dom";
import Header from "./Header/Header";
import Footer from "./Footer/Footer";

const Layout = () => {
  return (
    <>
      <Header />
      <main style={{ minHeight: "calc(100vh - 220px)", background: "#f5f7fe", paddingLeft: "15%", paddingRight: "15%" }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default Layout;
