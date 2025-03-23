import "./App.css";
import Footer from "./components/Footer";
import Home from "./components/Home";
import LandingPage from "./components/LandingPage";
import NavBar from "./components/Navbar";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
