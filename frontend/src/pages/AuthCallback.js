import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          navigate('/login');
          return;
        }

        const response = await axios.post(
          `${BACKEND_URL}/api/auth/session`,
          null,
          {
            params: { session_id: sessionId },
            withCredentials: true
          }
        );

        if (response.status === 200) {
          navigate('/dashboard', { state: { user: response.data }, replace: true });
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
    };

    processSession();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-primary text-lg font-mono">AUTHENTICATING...</div>
    </div>
  );
}

export default AuthCallback;
