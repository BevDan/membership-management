import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ArchivedVehiclesPage({ user }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadVehicles();
    loadMembers();
  }, [user, navigate]);

  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/vehicles`, {
        params: { include_archived: true },
        withCredentials: true
      });
      const archivedVehicles = response.data.filter(v => v.archived);
      setVehicles(archivedVehicles);
    } catch (error) {
      toast.error('Failed to load archived vehicles');
    }
  };

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/members`, {
        withCredentials: true
      });
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members');
    }
  };

  const handleRestore = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to restore this vehicle?')) {
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/vehicles/${vehicleId}/restore`,
        {},
        { withCredentials: true }
      );
      toast.success('Vehicle restored');
      loadVehicles();
    } catch (error) {
      toast.error('Failed to restore vehicle');
    }
  };

  const handlePermanentDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this vehicle? This cannot be undone!')) {
      return;
    }

    try {
      await axios.delete(
        `${BACKEND_URL}/api/vehicles/${vehicleId}/permanent`,
        { withCredentials: true }
      );
      toast.success('Vehicle permanently deleted');
      loadVehicles();
    } catch (error) {
      toast.error('Failed to delete vehicle');
    }
  };

  const getMemberName = (memberId) => {
    const member = members.find(m => m.member_id === memberId);
    return member ? `${member.name} (#${member.member_number})` : 'Unknown Member';
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-zinc-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-button"
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="sm"
              className="font-mono border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-white">
                ARCHIVED VEHICLES
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-4">
          {vehicles.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
              <p className="font-mono text-zinc-400">No archived vehicles</p>
            </Card>
          ) : (
            vehicles.map((vehicle) => (
              <Card
                key={vehicle.vehicle_id}
                data-testid={`archived-vehicle-${vehicle.registration}`}
                className="bg-zinc-900 border-zinc-800 border-l-4 border-l-zinc-700 p-6 rounded-sm opacity-75"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Vehicle</p>
                      <p className="font-display text-lg font-bold text-white">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="font-mono text-sm text-zinc-400 mt-1">{vehicle.body_style}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Registration</p>
                      <p className="font-mono text-lg font-bold text-zinc-400">{vehicle.registration}</p>
                      <p className="font-mono text-xs text-zinc-500 mt-1">Log: {vehicle.log_book_number}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Member</p>
                      <p className="font-mono text-sm text-zinc-400">{getMemberName(vehicle.member_id)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Status</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-500 font-mono text-xs uppercase rounded-sm">
                          Archived
                        </span>
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-500 font-mono text-xs uppercase rounded-sm">
                          {vehicle.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`restore-vehicle-${vehicle.registration}`}
                      onClick={() => handleRestore(vehicle.vehicle_id)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:border-green-500"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      data-testid={`delete-permanent-${vehicle.registration}`}
                      onClick={() => handlePermanentDelete(vehicle.vehicle_id)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:border-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default ArchivedVehiclesPage;
