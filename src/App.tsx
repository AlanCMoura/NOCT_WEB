// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import './index.css';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import OperationDetails from './pages/OperationDetails';
import ContainerDetails from './pages/ContainerDetails';
import NewOperation from './pages/NewOperation';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/operations/new" element={<NewOperation />} />
        <Route path="/operations/:operationId" element={<OperationDetails />} />
        <Route path="/operations/:operationId/containers/:containerId" element={<ContainerDetails />} />
        <Route path="*" element={<Login />} />
      </Routes> 
    </Router>
  );
};

export default App;
