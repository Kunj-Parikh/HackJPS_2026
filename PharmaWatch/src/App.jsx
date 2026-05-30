import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchPage from "./pages/SearchPage";
import DrugPage from "./pages/DrugPage";
import SignalDetailPage from "./pages/SignalDetailPage";
import MethodologyPage from "./pages/MethodologyPage";
import DashboardPage from "./pages/DashboardPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProtectedRoute from "./ProtectedRoute";
import { ThemeProvider } from "./ThemeContext";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />
      <Routes>
        <Route path="/" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/drug/:drugName" element={<ProtectedRoute><DrugPage /></ProtectedRoute>} />
        <Route path="/signal/:drugName/:symptom" element={<ProtectedRoute><SignalDetailPage /></ProtectedRoute>} />
        <Route path="/methodology" element={<ProtectedRoute><MethodologyPage /></ProtectedRoute>} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
      </BrowserRouter>
    </ThemeProvider>
  );
}
