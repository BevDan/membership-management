import React from 'react';
import { Button } from '../components/ui/button';

function LoginPage() {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1709963057730-9a8e3a23120c?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <div className="relative z-10 bg-zinc-900 border-4 border-l-primary border-zinc-800 p-8 sm:p-12 rounded-sm max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_dragadmin-portal/artifacts/jywyrakv_SCDC%20Logo.png" 
            alt="Steel City Drag Club"
            className="w-48 h-48 mx-auto mb-4 object-contain"
          />
          <p className="font-mono text-sm text-zinc-400 mt-4 uppercase tracking-wider">
            Member Management System
          </p>
        </div>
        
        <Button
          data-testid="google-login-button"
          onClick={handleLogin}
          className="w-full bg-primary hover:bg-primary/90 text-white font-mono uppercase tracking-wider py-6 rounded-sm transition-transform hover:-translate-y-1 shadow-lg shadow-primary/20"
        >
          Login with Google
        </Button>
        
        <p className="text-xs text-zinc-500 text-center mt-6 font-mono">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
