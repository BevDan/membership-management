import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Users, Car, Upload, Download, Settings, Archive, LogOut, FileText, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_members: 0,
    financial_members: 0,
    life_members_financial: 0,
    life_members_unfinancial: 0,
    members_with_vehicle_financial: 0,
    members_with_vehicle_unfinancial: 0,
    total_vehicles: 0,
    active_vehicles: 0,
    interest: { drag_racing: 0, car_enthusiast: 0, both: 0 },
    membership_type: { full: 0, family: 0, junior: 0 }
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/stats/dashboard`, { 
        withCredentials: true 
      });
      setStats(response.data);
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
          <div className="flex items-center gap-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_dragadmin-portal/artifacts/jywyrakv_SCDC%20Logo.png" 
              alt="SCDC"
              className="w-24 h-24 object-contain"
            />
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-primary">
                STEEL CITY DRAG CLUB
              </h1>
              <p className="font-mono text-xs text-zinc-400 uppercase tracking-wider mt-1">
                Control Room / {user?.role?.replace('_', ' ').toUpperCase()}
              </p>
            </div>
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

        {/* Main Stats Row - Members grouped together, vehicles at end */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Total Members</p>
            <p className="font-display text-3xl font-black text-white">{stats.total_members}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-green-500 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Financial Members</p>
            <p className="font-display text-3xl font-black text-white">{stats.financial_members}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-orange-500 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Unfinancial Members</p>
            <p className="font-display text-3xl font-black text-white">{stats.total_members - stats.financial_members}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Active Vehicles</p>
            <p className="font-display text-3xl font-black text-white">{stats.active_vehicles}</p>
          </Card>
        </div>

        {/* Life Members & Vehicle Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Life Members (Financial)</p>
            <p className="font-display text-2xl font-black text-green-400">{stats.life_members_financial}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Life Members (Unfinancial)</p>
            <p className="font-display text-2xl font-black text-orange-400">{stats.life_members_unfinancial}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Members with Vehicle(s) (Financial)</p>
            <p className="font-display text-2xl font-black text-green-400">{stats.members_with_vehicle_financial}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-1">Members with Vehicle(s) (Unfinancial)</p>
            <p className="font-display text-2xl font-black text-orange-400">{stats.members_with_vehicle_unfinancial}</p>
          </Card>
        </div>

        {/* Interest & Type Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-3">Members by Interest</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">Drag Racing</span>
                <span className="font-bold text-white">{stats.interest.drag_racing}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">Car Enthusiast</span>
                <span className="font-bold text-white">{stats.interest.car_enthusiast}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">Both</span>
                <span className="font-bold text-white">{stats.interest.both}</span>
              </div>
            </div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-sm">
            <p className="text-xs text-zinc-400 uppercase mb-3">Members by Type</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">Full</span>
                <span className="font-bold text-white">{stats.membership_type.full}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">Family</span>
                <span className="font-bold text-white">{stats.membership_type.family}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">Junior</span>
                <span className="font-bold text-white">{stats.membership_type.junior}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/members')}
            className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-primary text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
          >
            <Users className="w-8 h-8" />
            <span>Members</span>
          </Button>

          {canAccessVehicles && (
            <Button
              onClick={() => navigate('/vehicles')}
              className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-accent text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
            >
              <Car className="w-8 h-8" />
              <span>Vehicles</span>
            </Button>
          )}

          <Button
            onClick={() => navigate('/reports')}
            className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-purple-500 text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
          >
            <ClipboardList className="w-8 h-8" />
            <span>Reports</span>
          </Button>

          <Button
            onClick={() => navigate('/member-list')}
            className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-blue-500 text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
          >
            <FileText className="w-8 h-8" />
            <span>Member List</span>
          </Button>

          {isAdmin && (
            <Button
              onClick={() => navigate('/bulk-upload')}
              className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-secondary text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8" />
              <span>Bulk Upload</span>
            </Button>
          )}

          <Button
            onClick={() => navigate('/export')}
            className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-primary text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
          >
            <Download className="w-8 h-8" />
            <span>Export</span>
          </Button>

          {canAccessVehicles && (
            <Button
              onClick={() => navigate('/archived-vehicles')}
              className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-500 text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
            >
              <Archive className="w-8 h-8" />
              <span>Archived</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              className="h-24 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-red-500 text-white font-mono uppercase text-sm rounded-sm transition-all hover:-translate-y-1 flex flex-col items-center justify-center gap-2"
            >
              <Settings className="w-8 h-8" />
              <span>Admin</span>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
