import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Register
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
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        // Login
        await axios.post(`${BACKEND_URL}/api/auth/login`, {
          email: formData.email,
          password: formData.password
        }, { withCredentials: true });
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-zinc-400 mt-4 uppercase tracking-wider">
            Member Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <Label className="text-zinc-400 text-xs uppercase">Name</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className="bg-zinc-950 border-zinc-800"
                required={isRegister}
              />
            </div>
          )}
          
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
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Login')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-zinc-400 hover:text-primary transition-colors"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
        
        <p className="text-xs text-zinc-500 text-center mt-6">
          {isRegister ? 'First user to register becomes Admin' : 'Authorized personnel only'}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
