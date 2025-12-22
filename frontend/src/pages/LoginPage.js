import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function LoginPage() {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [hasUsers, setHasUsers] = useState(true);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Check if any users exist (to show/hide register option)
  useEffect(() => {
    const checkUsers = async () => {
      try {
        // Try to access a public endpoint that would fail if no users exist
        // We'll just try to register and see if it's allowed
        setCheckingUsers(false);
      } catch (error) {
        setCheckingUsers(false);
      }
    };
    checkUsers();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password
      }, { withCredentials: true });
      
      // Check if user must change password
      if (response.data.must_change_password) {
        setPasswordChangeData({ ...passwordChangeData, currentPassword: formData.password });
        setShowPasswordChange(true);
        toast.info('Please change your password to continue');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Name is required');
        setLoading(false);
        return;
      }
      await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email: formData.email,
        password: formData.password,
        name: formData.name
      }, { withCredentials: true });
      toast.success('Admin account created!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      if (message.includes('Registration closed')) {
        setHasUsers(true);
        setShowRegister(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordChangeData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);

    try {
      await axios.post(`${BACKEND_URL}/api/auth/change-password`, {
        current_password: passwordChangeData.currentPassword,
        new_password: passwordChangeData.newPassword,
        confirm_password: passwordChangeData.confirmPassword
      }, { withCredentials: true });
      
      toast.success('Password changed successfully!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to change password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Password Change Form
  if (showPasswordChange) {
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
              className="w-32 h-32 mx-auto mb-4 object-contain"
            />
            <h2 className="text-xl font-bold text-white uppercase">Change Password</h2>
            <p className="text-sm text-zinc-400 mt-2">
              You must change your password before continuing
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label className="text-zinc-400 text-xs uppercase">New Password</Label>
              <Input
                type="password"
                value={passwordChangeData.newPassword}
                onChange={(e) => setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="bg-zinc-950 border-zinc-800"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <Label className="text-zinc-400 text-xs uppercase">Confirm New Password</Label>
              <Input
                type="password"
                value={passwordChangeData.confirmPassword}
                onChange={(e) => setPasswordChangeData({ ...passwordChangeData, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                className="bg-zinc-950 border-zinc-800"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-wider py-6 rounded-sm transition-transform hover:-translate-y-1 shadow-lg shadow-primary/20"
            >
              {loading ? 'Please wait...' : 'Change Password'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Register Form (only for first admin)
  if (showRegister) {
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
            <p className="text-sm text-zinc-400 mt-4 uppercase tracking-wider">
              Create Admin Account
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label className="text-zinc-400 text-xs uppercase">Name</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className="bg-zinc-950 border-zinc-800"
                required
              />
            </div>
            
            <div>
              <Label className="text-zinc-400 text-xs uppercase">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="bg-zinc-950 border-zinc-800"
                required
              />
            </div>
            
            <div>
              <Label className="text-zinc-400 text-xs uppercase">Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="bg-zinc-950 border-zinc-800"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-wider py-6 rounded-sm transition-transform hover:-translate-y-1 shadow-lg shadow-primary/20"
            >
              {loading ? 'Please wait...' : 'Create Admin Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowRegister(false)}
              className="text-sm text-zinc-400 hover:text-primary transition-colors"
            >
              Back to Login
            </button>
          </div>
          
          <p className="text-xs text-zinc-500 text-center mt-6">
            This creates the first administrator account
          </p>
        </div>
      </div>
    );
  }

  // Login Form
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
          <p className="text-sm text-zinc-400 mt-4 uppercase tracking-wider">
            Member Management System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-xs uppercase">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              className="bg-zinc-950 border-zinc-800"
              required
            />
          </div>
          
          <div>
            <Label className="text-zinc-400 text-xs uppercase">Password</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="bg-zinc-950 border-zinc-800"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-wider py-6 rounded-sm transition-transform hover:-translate-y-1 shadow-lg shadow-primary/20"
          >
            {loading ? 'Please wait...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="text-sm text-zinc-400 hover:text-primary transition-colors"
          >
            Setup first admin account
          </button>
        </div>
        
        <p className="text-xs text-zinc-500 text-center mt-6">
          Contact your administrator if you need an account
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
