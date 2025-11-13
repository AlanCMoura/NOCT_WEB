// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import './index.css';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import OperationDetails from './pages/OperationDetails';
import ContainerDetails from './pages/ContainerDetails';
import Users from './pages/Users';
import NewOperation from './pages/NewOperation';
import NewContainer from './pages/NewContainer';
import Sacaria from './pages/Sacaria';
import Profile from './pages/Profile';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import OperationOverview from './pages/OperationOverview';
import Reports from './pages/Reports';
import ReportBuilder from './pages/ReportBuilder';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SidebarProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/operations/new" element={<NewOperation />} />
            <Route path="/operations/:operationId" element={<OperationDetails />} />
            <Route path="/operations/:operationId/containers/new" element={<NewContainer />} />
            <Route path="/operations/:operationId/sacaria" element={<Sacaria />} />
            <Route path="/operations/:operationId/overview" element={<OperationOverview />} />
            <Route path="/operations/:operationId/containers/:containerId" element={<ContainerDetails />} />
            <Route path="/users" element={<Users />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/generate" element={<ReportBuilder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Login />} />
          </Routes>
        </SidebarProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;

