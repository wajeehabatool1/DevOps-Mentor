import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import TopNav from "./Components/TopNav";
import Sidebar from "./Components/SideBar";
import TerminalQuiz from "./Components/Terminal";
import UserProfile from "./Components/userProfile";
import ToolData from "./Components/ToolsPage";
import Labs from "./Components/LabsPage";
import LoadingScreen from "./Components/LoadingPage";
import HomePage from "./Components/HomePage";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen">
      <TopNav isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? "md:ml-60 " : "ml-4 md:ml-14"
        } pt-16`}
      >      
        <Routes>      
          <Route path="/" element={<HomePage />} />
          <Route path="/tools" element={<ToolData />} />
          <Route path="/:toolId/labs" element={<Labs />} /> {/* Labs page route */}
          <Route path="/terminal" element={<TerminalQuiz />} />
          <Route path="/labs/:labId/questions" element={<TerminalQuiz sOpen={isSidebarOpen} />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/loading" element={<LoadingScreen />} />
        </Routes>
      </main>
    </div>
  );
}