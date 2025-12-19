import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    if (location.state?.user) {
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          withCredentials: true
        });
        if (response.status === 200) {
          setIsAuthenticated(true);
          setUser(response.data);
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-primary text-lg font-mono">LOADING...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return React.cloneElement(children, { user });
}

export default ProtectedRoute;
