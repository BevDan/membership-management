import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Search, Plus, Edit, Archive } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function VehiclesPage({ user }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('registration');
  const [registrations, setRegistrations] = useState([]);
  const [logBookNumbers, setLogBookNumbers] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleOptions, setVehicleOptions] = useState({ statuses: [], reasons: [] });
  const [formData, setFormData] = useState({
    member_id: '',
    log_book_number: '',
    entry_date: '',
    expiry_date: '',
    make: '',
    body_style: '',
    model: '',
    year: new Date().getFullYear(),
    registration: '',
    status: 'Active',
    reason: ''
  });

  useEffect(() => {
    loadVehicles();
    loadMembers();
    loadVehicleOptions();
    loadVehicleSearchData();
  }, []);

  const loadVehicleSearchData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/vehicles`, {
        withCredentials: true
      });
      const regs = response.data.map(v => v.registration).filter(r => r).sort();
      const logBooks = response.data.map(v => v.log_book_number).filter(l => l).sort();
      setRegistrations(regs);
      setLogBookNumbers(logBooks);
    } catch (error) {
      console.error('Failed to load vehicle search data');
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/vehicles`, {
        withCredentials: true
      });
      setVehicles(response.data);
    } catch (error) {
      toast.error('Failed to load vehicles');
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

  const loadVehicleOptions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/vehicle-options`, {
        withCredentials: true
      });
      const options = response.data;
      setVehicleOptions({
        statuses: options.filter(o => o.type === 'status'),
        reasons: options.filter(o => o.type === 'reason')
      });
    } catch (error) {
      console.error('Failed to load vehicle options');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      loadVehicles();
      return;
    }

    try {
      if (searchType === 'logbook') {
        // Search by log book number on frontend since backend doesn't have this endpoint
        const filtered = vehicles.filter(v => 
          v.log_book_number && v.log_book_number.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setVehicles(filtered);
      } else {
        const response = await axios.get(`${BACKEND_URL}/api/vehicles`, {
          params: { registration: searchTerm },
          withCredentials: true
        });
        setVehicles(response.data);
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const filteredSearchOptions = searchType === 'logbook' 
    ? logBookNumbers.filter(lb => lb.toLowerCase().includes(searchTerm.toLowerCase()))
    : registrations.filter(reg => reg.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreate = () => {
    setEditingVehicle(null);
    setFormData({
      member_id: '',
      log_book_number: '',
      entry_date: '',
      expiry_date: '',
      make: '',
      body_style: '',
      model: '',
      year: new Date().getFullYear(),
      registration: '',
      status: 'Active',
      reason: ''
    });
    setShowDialog(true);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      member_id: vehicle.member_id,
      log_book_number: vehicle.log_book_number,
      entry_date: vehicle.entry_date ? vehicle.entry_date.split('T')[0] : '',
      expiry_date: vehicle.expiry_date ? vehicle.expiry_date.split('T')[0] : '',
      make: vehicle.make,
      body_style: vehicle.body_style,
      model: vehicle.model,
      year: vehicle.year,
      registration: vehicle.registration,
      status: vehicle.status,
      reason: vehicle.reason
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingVehicle) {
        await axios.put(
          `${BACKEND_URL}/api/vehicles/${editingVehicle.vehicle_id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Vehicle updated');
      } else {
        await axios.post(
          `${BACKEND_URL}/api/vehicles`,
          formData,
          { withCredentials: true }
        );
        toast.success('Vehicle created');
      }
      setShowDialog(false);
      loadVehicles();
      loadVehicleSearchData(); // Refresh search dropdowns
    } catch (error) {
      toast.error('Failed to save vehicle');
    }
  };

  const handleArchive = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to archive this vehicle?')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/vehicles/${vehicleId}`, {
        withCredentials: true
      });
      toast.success('Vehicle archived');
      loadVehicles();
    } catch (error) {
      toast.error('Failed to archive vehicle');
    }
  };

  const getMemberName = (memberId) => {
    const member = members.find(m => m.member_id === memberId);
    return member ? `${member.name} (#${member.member_number})` : 'Unknown Member';
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-accent shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                data-testid="back-button"
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="sm"
                className="border-zinc-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_raceroster/artifacts/brmlixop_Enthusiast%20Logo.jpg" 
                alt="Car Enthusiasts"
                className="w-16 h-16 object-contain rounded"
              />
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-black text-white">
                  VEHICLE MANAGEMENT
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-6 rounded-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-9">
              <Label className="text-zinc-400 font-mono text-xs uppercase">Registration Number</Label>
              <Input
                data-testid="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter registration number"
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div className="md:col-span-3 flex items-end gap-2">
              <Button
                data-testid="search-button"
                onClick={handleSearch}
                className="flex-1 bg-accent hover:bg-accent/90 text-zinc-900 font-mono uppercase"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                data-testid="add-vehicle-button"
                onClick={handleCreate}
                className="flex-1 bg-secondary hover:bg-secondary/90 text-zinc-900 font-mono uppercase"
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {vehicles.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
              <p className="font-mono text-zinc-400">No vehicles found</p>
            </Card>
          ) : (
            vehicles.map((vehicle) => (
              <Card
                key={vehicle.vehicle_id}
                data-testid={`vehicle-card-${vehicle.registration}`}
                className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-6 rounded-sm"
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
                      <p className="font-mono text-lg font-bold text-accent">{vehicle.registration}</p>
                      <p className="font-mono text-xs text-zinc-400 mt-1">Log: {vehicle.log_book_number}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Member</p>
                      <p className="font-mono text-sm text-zinc-300">{getMemberName(vehicle.member_id)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Status</p>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-2 py-1 font-mono text-xs uppercase rounded-sm ${
                            vehicle.status === 'Active'
                              ? 'bg-green-500/20 text-green-400'
                              : vehicle.status === 'Cancelled'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {vehicle.status}
                        </span>
                        {vehicle.reason && (
                          <span className="px-2 py-1 bg-secondary/20 text-secondary font-mono text-xs uppercase rounded-sm">
                            {vehicle.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`edit-vehicle-${vehicle.registration}`}
                      onClick={() => handleEdit(vehicle)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:border-secondary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      data-testid={`archive-vehicle-${vehicle.registration}`}
                      onClick={() => handleArchive(vehicle.vehicle_id)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:border-zinc-500"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_raceroster/artifacts/brmlixop_Enthusiast%20Logo.jpg" 
                alt="Car Enthusiasts"
                className="w-12 h-12 object-contain rounded"
              />
              <DialogTitle className="font-display text-2xl text-white">
                {editingVehicle ? 'EDIT VEHICLE' : 'NEW VEHICLE'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="md:col-span-2">
              <Label className="text-zinc-400 font-mono text-xs">Member *</Label>
              <Select
                value={formData.member_id}
                onValueChange={(value) => setFormData({ ...formData, member_id: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 font-mono">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {members.map((member) => (
                    <SelectItem key={member.member_id} value={member.member_id}>
                      {member.name} (#{member.member_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Log Book Number *</Label>
              <Input
                value={formData.log_book_number}
                onChange={(e) => setFormData({ ...formData, log_book_number: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Registration *</Label>
              <Input
                value={formData.registration}
                onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Make *</Label>
              <Input
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Model *</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Body Style *</Label>
              <Input
                value={formData.body_style}
                onChange={(e) => setFormData({ ...formData, body_style: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Year *</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Entry Date</Label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {vehicleOptions.statuses.map((option) => (
                    <SelectItem key={option.option_id} value={option.value}>
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 font-mono">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {vehicleOptions.reasons.map((option) => (
                    <SelectItem key={option.option_id} value={option.value}>
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="border-zinc-700 font-mono uppercase"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-vehicle-button"
              onClick={handleSave}
              className="bg-accent hover:bg-accent/90 text-zinc-900 font-mono uppercase"
            >
              {editingVehicle ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VehiclesPage;
