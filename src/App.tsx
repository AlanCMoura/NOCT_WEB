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
import OperationOverview from './pages/OperationOverview';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
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
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;

