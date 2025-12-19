import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Plus, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function AdminPage({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState({ statuses: [], reasons: [] });
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showOptionDialog, setShowOptionDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({ email: '', name: '', role: 'member_editor' });
  const [optionFormData, setOptionFormData] = useState({ type: 'status', value: '' });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadUsers();
    loadVehicleOptions();
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users`, {
        withCredentials: true
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
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
      toast.error('Failed to load vehicle options');
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserFormData({ email: '', name: '', role: 'member_editor' });
    setShowUserDialog(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({ email: user.email, name: user.name, role: user.role });
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await axios.put(
          `${BACKEND_URL}/api/users/${editingUser.user_id}`,
          userFormData,
          { withCredentials: true }
        );
        toast.success('User updated');
      } else {
        await axios.post(
          `${BACKEND_URL}/api/users`,
          userFormData,
          { withCredentials: true }
        );
        toast.success('User created');
      }
      setShowUserDialog(false);
      loadUsers();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to save user';
      toast.error(errorMsg);
      console.error('User save error:', error.response?.data);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/users/${userId}`, {
        withCredentials: true
      });
      toast.success('User deleted');
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleCreateOption = () => {
    setOptionFormData({ type: 'status', value: '' });
    setShowOptionDialog(true);
  };

  const handleSaveOption = async () => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/vehicle-options`,
        optionFormData,
        { withCredentials: true }
      );
      toast.success('Option created');
      setShowOptionDialog(false);
      loadVehicleOptions();
    } catch (error) {
      toast.error('Failed to create option');
    }
  };

  const handleDeleteOption = async (optionId) => {
    if (!window.confirm('Are you sure you want to delete this option?')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/vehicle-options/${optionId}`, {
        withCredentials: true
      });
      toast.success('Option deleted');
      loadVehicleOptions();
    } catch (error) {
      toast.error('Failed to delete option');
    }
  };

  const handleClearAllData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/clear-all-data?confirm=DELETE_ALL_DATA`,
        {},
        { withCredentials: true }
      );
      toast.success(`${response.data.message}. Deleted ${response.data.deleted_members} members and ${response.data.deleted_vehicles} vehicles.`);
      
      // Optionally navigate back to dashboard after clearing
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      toast.error('Failed to clear data: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-red-500 shadow-lg sticky top-0 z-50">
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
                ADMIN PANEL
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
            <TabsTrigger data-testid="tab-users" value="users" className="font-mono uppercase">
              Users
            </TabsTrigger>
            <TabsTrigger data-testid="tab-vehicle-options" value="vehicle-options" className="font-mono uppercase">
              Vehicle Options
            </TabsTrigger>
            <TabsTrigger data-testid="tab-data-management" value="data-management" className="font-mono uppercase">
              Data Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-6 rounded-sm mb-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl font-black text-white">USER MANAGEMENT</h2>
                <Button
                  data-testid="add-user-button"
                  onClick={handleCreateUser}
                  className="bg-primary hover:bg-primary/90 font-mono uppercase"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              <div className="space-y-3">
                {users.map((u) => (
                  <Card
                    key={u.user_id}
                    data-testid={`user-card-${u.email}`}
                    className="bg-zinc-950 border-zinc-800 p-4 rounded-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm font-bold text-white">{u.name}</p>
                      <p className="font-mono text-xs text-zinc-400">{u.email}</p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 font-mono text-xs uppercase rounded-sm ${
                          u.role === 'admin'
                            ? 'bg-red-500/20 text-red-400'
                            : u.role === 'full_editor'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        data-testid={`edit-user-${u.email}`}
                        onClick={() => handleEditUser(u)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`delete-user-${u.email}`}
                        onClick={() => handleDeleteUser(u.user_id)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 hover:border-red-500"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="vehicle-options">
            <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-6 rounded-sm mb-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl font-black text-white">VEHICLE OPTIONS</h2>
                <Button
                  data-testid="add-option-button"
                  onClick={handleCreateOption}
                  className="bg-accent hover:bg-accent/90 text-zinc-900 font-mono uppercase"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-white mb-3">STATUS OPTIONS</h3>
                  <div className="space-y-2">
                    {vehicleOptions.statuses.map((option) => (
                      <Card
                        key={option.option_id}
                        data-testid={`status-option-${option.value}`}
                        className="bg-zinc-950 border-zinc-800 p-3 rounded-sm flex items-center justify-between"
                      >
                        <span className="font-mono text-sm text-white">{option.value}</span>
                        <Button
                          data-testid={`delete-status-${option.value}`}
                          onClick={() => handleDeleteOption(option.option_id)}
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 hover:border-red-500"
                        >
                          <Trash className="w-3 h-3" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-white mb-3">REASON OPTIONS</h3>
                  <div className="space-y-2">
                    {vehicleOptions.reasons.map((option) => (
                      <Card
                        key={option.option_id}
                        data-testid={`reason-option-${option.value}`}
                        className="bg-zinc-950 border-zinc-800 p-3 rounded-sm flex items-center justify-between"
                      >
                        <span className="font-mono text-sm text-white">{option.value}</span>
                        <Button
                          data-testid={`delete-reason-${option.value}`}
                          onClick={() => handleDeleteOption(option.option_id)}
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 hover:border-red-500"
                        >
                          <Trash className="w-3 h-3" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="data-management">
            <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-red-500 p-6 rounded-sm">
              <h2 className="font-display text-2xl font-black text-white mb-4">DANGER ZONE</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-zinc-950 rounded-sm border border-red-500/20">
                  <h3 className="font-display text-lg font-bold text-red-400 mb-2">Clear All Data</h3>
                  <p className="font-mono text-sm text-zinc-400 mb-4">
                    This will permanently delete ALL members and vehicles from the database. 
                    This action CANNOT be undone. Use this before doing a fresh import from your CSV files.
                  </p>
                  
                  <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4 mb-4">
                    <p className="font-mono text-xs text-red-400 mb-2 uppercase font-bold">⚠️ Warning</p>
                    <ul className="font-mono text-xs text-zinc-400 space-y-1">
                      <li>• All member records will be deleted</li>
                      <li>• All vehicle records will be deleted</li>
                      <li>• User accounts will NOT be deleted (safe)</li>
                      <li>• Vehicle options will NOT be deleted (safe)</li>
                    </ul>
                  </div>

                  <Button
                    data-testid="clear-all-data-button"
                    onClick={() => {
                      const confirmed = window.prompt(
                        'This will DELETE ALL members and vehicles!\n\n' +
                        'Type "DELETE_ALL_DATA" to confirm:'
                      );
                      
                      if (confirmed === 'DELETE_ALL_DATA') {
                        handleClearAllData();
                      } else if (confirmed !== null) {
                        toast.error('Confirmation text did not match. Action cancelled.');
                      }
                    }}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-mono uppercase"
                  >
                    Clear All Members & Vehicles
                  </Button>
                </div>

                <div className="p-4 bg-zinc-950 rounded-sm">
                  <h3 className="font-display text-lg font-bold text-white mb-2">Fresh Import Instructions</h3>
                  <ol className="font-mono text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>Click "Clear All Members & Vehicles" above</li>
                    <li>Type DELETE_ALL_DATA to confirm</li>
                    <li>Go to Bulk Upload page</li>
                    <li>Upload your clean CSV file</li>
                    <li>All records will be imported fresh without duplicates</li>
                  </ol>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">
              {editingUser ? 'EDIT USER' : 'NEW USER'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Email *</Label>
              <Input
                data-testid="user-email-input"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                disabled={!!editingUser}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Name *</Label>
              <Input
                data-testid="user-name-input"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Role</Label>
              <Select
                value={userFormData.role}
                onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}
              >
                <SelectTrigger data-testid="user-role-select" className="bg-zinc-950 border-zinc-800 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="full_editor">Full Editor</SelectItem>
                  <SelectItem value="member_editor">Member Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              onClick={() => setShowUserDialog(false)}
              variant="outline"
              className="border-zinc-700 font-mono uppercase"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-user-button"
              onClick={handleSaveUser}
              className="bg-primary hover:bg-primary/90 font-mono uppercase"
            >
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showOptionDialog} onOpenChange={setShowOptionDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">NEW VEHICLE OPTION</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Type</Label>
              <Select
                value={optionFormData.type}
                onValueChange={(value) => setOptionFormData({ ...optionFormData, type: value })}
              >
                <SelectTrigger data-testid="option-type-select" className="bg-zinc-950 border-zinc-800 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="reason">Reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Value *</Label>
              <Input
                data-testid="option-value-input"
                value={optionFormData.value}
                onChange={(e) => setOptionFormData({ ...optionFormData, value: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              onClick={() => setShowOptionDialog(false)}
              variant="outline"
              className="border-zinc-700 font-mono uppercase"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-option-button"
              onClick={handleSaveOption}
              className="bg-accent hover:bg-accent/90 text-zinc-900 font-mono uppercase"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPage;
