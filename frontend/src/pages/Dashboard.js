import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Users, Car, Upload, Download, Settings, Archive, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    financialMembers: 0,
    totalVehicles: 0,
    activeVehicles: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [membersRes, vehiclesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/members`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/vehicles`, { withCredentials: true })
      ]);
      
      const members = membersRes.data;
      const vehicles = vehiclesRes.data;
      
      setStats({
        totalMembers: members.length,
        financialMembers: members.filter(m => m.financial).length,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'Active').length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const canAccessVehicles = user && (user.role === 'admin' || user.role === 'full_editor');
  const isAdmin = user && user.role === 'admin';

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-primary shadow-lg shadow-primary/10 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-black text-primary">
              STEEL CITY <span className="text-white">[DRAG CLUB]</span>
            </h1>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-wider mt-1">
              Control Room / {user?.role?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="font-mono text-sm text-white">{user?.name}</p>
              <p className="font-mono text-xs text-zinc-400">{user?.email}</p>
            </div>
            <Button
              data-testid="logout-button"
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="font-mono uppercase tracking-wider border-zinc-700 hover:border-primary hover:bg-primary/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-2">DASHBOARD</h2>
          <p className="font-mono text-zinc-400 uppercase tracking-wider">System Overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-total-members" className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-6 rounded-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-2">Total Members</p>
                <p className="font-display text-4xl font-black text-white">{stats.totalMembers}</p>
              </div>
              <Users className="w-12 h-12 text-primary opacity-50" />
            </div>
          </Card>

          <Card data-testid="stat-financial-members" className="bg-zinc-900 border-zinc-800 border-l-4 border-l-secondary p-6 rounded-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-2">Financial</p>
                <p className="font-display text-4xl font-black text-white">{stats.financialMembers}</p>
              </div>
              <Users className="w-12 h-12 text-secondary opacity-50" />
            </div>
          </Card>

          <Card data-testid="stat-total-vehicles" className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-6 rounded-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-2">Total Vehicles</p>
                <p className="font-display text-4xl font-black text-white">{stats.totalVehicles}</p>
              </div>
              <Car className="w-12 h-12 text-accent opacity-50" />
            </div>
          </Card>

          <Card data-testid="stat-active-vehicles" className="bg-zinc-900 border-zinc-800 border-l-4 border-l-green-500 p-6 rounded-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-2">Active Vehicles</p>
                <p className="font-display text-4xl font-black text-white">{stats.activeVehicles}</p>
              </div>
              <Car className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Button
            data-testid="navigate-members-button"
            onClick={() => navigate('/members')}
            className="h-32 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-primary text-white font-mono uppercase tracking-wider rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
          >
            <Users className="w-10 h-10" />
            <span>Manage Members</span>
          </Button>

          {canAccessVehicles && (
            <Button
              data-testid="navigate-vehicles-button"
              onClick={() => navigate('/vehicles')}
              className="h-32 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-accent text-white font-mono uppercase tracking-wider rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
            >
              <Car className="w-10 h-10" />
              <span>Manage Vehicles</span>
            </Button>
          )}

          <Button
            data-testid="navigate-bulk-upload-button"
            onClick={() => navigate('/bulk-upload')}
            className="h-32 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-secondary text-white font-mono uppercase tracking-wider rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
          >
            <Upload className="w-10 h-10" />
            <span>Bulk Upload</span>
          </Button>

          <Button
            data-testid="navigate-export-button"
            onClick={() => navigate('/export')}
            className="h-32 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-primary text-white font-mono uppercase tracking-wider rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
          >
            <Download className="w-10 h-10" />
            <span>Export Data</span>
          </Button>

          {canAccessVehicles && (
            <Button
              data-testid="navigate-archived-button"
              onClick={() => navigate('/archived-vehicles')}
              className="h-32 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-500 text-white font-mono uppercase tracking-wider rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
            >
              <Archive className="w-10 h-10" />
              <span>Archived Vehicles</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              data-testid="navigate-admin-button"
              onClick={() => navigate('/admin')}
              className="h-32 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-red-500 text-white font-mono uppercase tracking-wider rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
            >
              <Settings className="w-10 h-10" />
              <span>Admin Panel</span>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
