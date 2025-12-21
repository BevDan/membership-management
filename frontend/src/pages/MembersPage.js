import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, Search, Plus, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function MembersPage({ user }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [memberNumbers, setMemberNumbers] = useState([]);
  const [memberNames, setMemberNames] = useState([]);
  const [vehicleSearchData, setVehicleSearchData] = useState([]);
  const [showMemberNumberDropdown, setShowMemberNumberDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [memberVehicles, setMemberVehicles] = useState([]);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleOptions, setVehicleOptions] = useState({ statuses: [], reasons: [] });
  const [vehicleFormData, setVehicleFormData] = useState({
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
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    suburb: '',
    postcode: '',
    state: '',
    phone1: '',
    phone2: '',
    email1: '',
    email2: '',
    life_member: false,
    financial: false,
    membership_type: 'Full',
    family_members: [],
    interest: 'Both',
    date_paid: '',
    expiry_date: '',
    comments: '',
    receive_emails: true,
    receive_sms: true
  });
  const [suburbs, setSuburbs] = useState([]);
  const [suburbInput, setSuburbInput] = useState('');
  const [showSuburbDropdown, setShowSuburbDropdown] = useState(false);

  useEffect(() => {
    loadMembers();
    loadSuburbs();
    loadMemberNumbers();
    loadMemberNames();
    loadVehicleSearchData();
    loadVehicleOptions();
  }, []);

  const canAccessVehicles = user && (user.role === 'admin' || user.role === 'full_editor');

  const loadVehicleSearchData = async () => {
    if (!canAccessVehicles) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/vehicles`, {
        withCredentials: true
      });
      const data = response.data.map(v => ({
        registration: v.registration,
        log_book_number: v.log_book_number,
        member_id: v.member_id,
        vehicle: `${v.year} ${v.make} ${v.model}`
      }));
      setVehicleSearchData(data);
    } catch (error) {
      console.error('Failed to load vehicle search data');
    }
  };

  const loadVehicleOptions = async () => {
    if (!canAccessVehicles) return;
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

  const loadMemberVehicles = async (memberId) => {
    if (!canAccessVehicles || !memberId) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/vehicles`, {
        params: { member_id: memberId },
        withCredentials: true
      });
      setMemberVehicles(response.data);
    } catch (error) {
      console.error('Failed to load member vehicles');
    }
  };

  const loadSuburbs = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/members/suburbs/list`, {
        withCredentials: true
      });
      setSuburbs(response.data);
    } catch (error) {
      console.error('Failed to load suburbs');
    }
  };

  const loadMemberNumbers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/members`, {
        withCredentials: true
      });
      const numbers = response.data.map(m => m.member_number).sort((a, b) => {
        // Try numeric sort first, fall back to string sort
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return String(a).localeCompare(String(b));
      });
      setMemberNumbers(numbers);
    } catch (error) {
      console.error('Failed to load member numbers');
    }
  };

  const loadMemberNames = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/members`, {
        withCredentials: true
      });
      const names = response.data
        .map(m => ({ 
          name: m.name, 
          number: m.member_number,
          email1: m.email1 || '',
          email2: m.email2 || ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setMemberNames(names);
    } catch (error) {
      console.error('Failed to load member names');
    }
  };

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/members`, {
        withCredentials: true
      });
      setMembers(response.data);
    } catch (error) {
      toast.error('Failed to load members');
    }
  };

  const handleSearch = async (overrideSearchTerm = null) => {
    const termToSearch = overrideSearchTerm !== null ? overrideSearchTerm : searchTerm;
    
    if (!termToSearch) {
      loadMembers();
      return;
    }

    try {
      if (searchType === 'registration' || searchType === 'logbook') {
        // Find member by vehicle
        const vehicle = vehicleSearchData.find(v => {
          if (searchType === 'registration') {
            return v.registration && v.registration.toLowerCase() === termToSearch.toLowerCase();
          } else {
            return v.log_book_number && v.log_book_number.toLowerCase() === termToSearch.toLowerCase();
          }
        });
        
        if (vehicle) {
          const response = await axios.get(`${BACKEND_URL}/api/members/${vehicle.member_id}`, {
            withCredentials: true
          });
          setMembers([response.data]);
          toast.success('Found member by vehicle');
        } else {
          setMembers([]);
          toast.info('No member found with that vehicle');
        }
      } else {
        const params = searchType === 'number' 
          ? { member_number: String(termToSearch).trim() }
          : { search: termToSearch };
        
        const response = await axios.get(`${BACKEND_URL}/api/members`, {
          params,
          withCredentials: true
        });
        setMembers(response.data);
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const filteredMemberNumbers = memberNumbers.filter(num => 
    String(num).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMemberNames = memberNames.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return member.name.toLowerCase().includes(searchLower) ||
           member.email1.toLowerCase().includes(searchLower) ||
           member.email2.toLowerCase().includes(searchLower);
  });

  const filteredVehicleSearch = vehicleSearchData.filter(v => {
    const searchLower = searchTerm.toLowerCase();
    if (searchType === 'registration') {
      return v.registration && v.registration.toLowerCase().includes(searchLower);
    } else {
      return v.log_book_number && v.log_book_number.toLowerCase().includes(searchLower);
    }
  });

  const handleCreate = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      address: '',
      suburb: '',
      postcode: '',
      state: '',
      phone1: '',
      phone2: '',
      email1: '',
      email2: '',
      life_member: false,
      financial: false,
      membership_type: 'Full',
      family_members: [],
      interest: 'Both',
      date_paid: '',
      expiry_date: '',
      comments: '',
      receive_emails: true,
      receive_sms: true
    });
    setSuburbInput('');
    setShowDialog(true);
  };

  const handleEdit = async (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      address: member.address,
      suburb: member.suburb,
      postcode: member.postcode,
      state: member.state || '',
      phone1: member.phone1 || '',
      phone2: member.phone2 || '',
      email1: member.email1 || '',
      email2: member.email2 || '',
      life_member: member.life_member,
      financial: member.financial,
      membership_type: member.membership_type,
      family_members: member.family_members || [],
      interest: member.interest,
      date_paid: member.date_paid ? member.date_paid.split('T')[0] : '',
      expiry_date: member.expiry_date ? member.expiry_date.split('T')[0] : '',
      comments: member.comments || '',
      receive_emails: member.receive_emails,
      receive_sms: member.receive_sms
    });
    setSuburbInput(member.suburb);
    await loadMemberVehicles(member.member_id);
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        suburb: suburbInput.trim() || formData.suburb || '',
        // Convert empty email strings to null for validation
        email1: formData.email1?.trim() || null,
        email2: formData.email2?.trim() || null,
        // Convert empty phone strings to null
        phone1: formData.phone1?.trim() || null,
        phone2: formData.phone2?.trim() || null,
        // Convert empty comments to null
        comments: formData.comments?.trim() || null
      };
      
      // Ensure required fields are not empty
      if (!dataToSave.name || !dataToSave.address || !dataToSave.suburb || !dataToSave.postcode) {
        toast.error('Please fill in all required fields (Name, Address, Suburb, Postcode)');
        return;
      }
      
      if (editingMember) {
        await axios.put(
          `${BACKEND_URL}/api/members/${editingMember.member_id}`,
          dataToSave,
          { withCredentials: true }
        );
        toast.success('Member updated');
      } else {
        await axios.post(
          `${BACKEND_URL}/api/members`,
          dataToSave,
          { withCredentials: true }
        );
        toast.success('Member created');
      }
      setShowDialog(false);
      loadMembers();
      loadSuburbs();
      loadMemberNumbers();
      loadMemberNames(); // Refresh member name list
    } catch (error) {
      console.error('Save member error:', error.response?.data);
      const errorDetail = error.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        toast.error(`Failed to save member: ${errorDetail}`);
      } else if (Array.isArray(errorDetail)) {
        // Pydantic validation errors
        const fields = errorDetail.map(e => e.loc[e.loc.length - 1]).join(', ');
        toast.error(`Validation error in fields: ${fields}`);
      } else {
        toast.error('Failed to save member');
      }
    }
  };

  const addFamilyMember = () => {
    setFormData({
      ...formData,
      family_members: [...(formData.family_members || []), '']
    });
  };

  const updateFamilyMember = (index, value) => {
    const updated = [...(formData.family_members || [])];
    updated[index] = value;
    setFormData({ ...formData, family_members: updated });
  };

  const removeFamilyMember = (index) => {
    const updated = [...(formData.family_members || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, family_members: updated });
  };

  const filteredSuburbs = suburbs.filter(s => 
    s.toLowerCase().includes(suburbInput.toLowerCase())
  );

  const handleDelete = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member? All associated vehicles will also be deleted.')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/members/${memberId}`, {
        withCredentials: true
      });
      toast.success('Member deleted');
      loadMembers();
    } catch (error) {
      toast.error('Failed to delete member');
    }
  };

  const isAdmin = user && user.role === 'admin';

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                  MEMBER MANAGEMENT
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-6 rounded-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <Label className="text-zinc-400 font-mono text-xs uppercase">Search By</Label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger data-testid="search-type-select" className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="name">Name/Email</SelectItem>
                  <SelectItem value="number">Member Number</SelectItem>
                  {canAccessVehicles && <SelectItem value="registration">Vehicle Registration</SelectItem>}
                  {canAccessVehicles && <SelectItem value="logbook">Vehicle Log Book</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-7">
              <Label className="text-zinc-400 font-mono text-xs uppercase">
                {searchType === 'number' && 'Member Number'}
                {searchType === 'name' && 'Name or Email'}
                {searchType === 'registration' && 'Vehicle Registration'}
                {searchType === 'logbook' && 'Vehicle Log Book Number'}
              </Label>
              {searchType === 'number' ? (
                <div className="relative">
                  <Input
                    data-testid="search-input"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowMemberNumberDropdown(true);
                    }}
                    onFocus={() => setShowMemberNumberDropdown(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Select or type member number"
                    className="bg-zinc-950 border-zinc-800"
                  />
                  {showMemberNumberDropdown && filteredMemberNumbers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-sm max-h-64 overflow-y-auto">
                      {filteredMemberNumbers.slice(0, 20).map((num, idx) => {
                        const numStr = String(num);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSearchTerm(numStr);
                              setShowMemberNumberDropdown(false);
                              handleSearch(numStr);
                            }}
                            className="px-3 py-2 hover:bg-zinc-800 cursor-pointer font-mono text-sm text-zinc-300"
                          >
                            #{num}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : searchType === 'name' ? (
                <div className="relative">
                  <Input
                    data-testid="search-input"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowNameDropdown(true);
                    }}
                    onFocus={() => setShowNameDropdown(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Select or type member name"
                    className="bg-zinc-950 border-zinc-800"
                  />
                  {showNameDropdown && filteredMemberNames.length > 0 && searchTerm && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-sm max-h-64 overflow-y-auto">
                      {filteredMemberNames.slice(0, 20).map((member, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSearchTerm(member.name);
                            setShowNameDropdown(false);
                            handleSearch(member.name);
                          }}
                          className="px-3 py-2 hover:bg-zinc-800 cursor-pointer text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{member.name}</span>
                            <span className="text-zinc-500 text-xs">#{member.number}</span>
                          </div>
                          {(member.email1 || member.email2) && (
                            <div className="text-xs text-zinc-400 mt-1">
                              {member.email1 && <span>{member.email1}</span>}
                              {member.email1 && member.email2 && <span className="mx-1">•</span>}
                              {member.email2 && <span>{member.email2}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (searchType === 'registration' || searchType === 'logbook') ? (
                <div className="relative">
                  <Input
                    data-testid="search-input"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowVehicleDropdown(true);
                    }}
                    onFocus={() => setShowVehicleDropdown(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={searchType === 'registration' ? 'Select or type registration' : 'Select or type log book number'}
                    className="bg-zinc-950 border-zinc-800"
                  />
                  {showVehicleDropdown && filteredVehicleSearch.length > 0 && searchTerm && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-900 border-zinc-800 rounded-sm max-h-64 overflow-y-auto">
                      {filteredVehicleSearch.slice(0, 20).map((vehicle, idx) => {
                        const valueToSearch = searchType === 'registration' ? vehicle.registration : vehicle.log_book_number;
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSearchTerm(valueToSearch);
                              setShowVehicleDropdown(false);
                              handleSearch(valueToSearch);
                            }}
                            className="px-3 py-2 hover:bg-zinc-800 cursor-pointer text-sm"
                          >
                            <div className="text-white font-semibold">
                              {valueToSearch}
                            </div>
                            <div className="text-xs text-zinc-400">{vehicle.vehicle}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button
                data-testid="search-button"
                onClick={handleSearch}
                className="flex-1 bg-primary hover:bg-primary/90 font-mono uppercase"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                data-testid="add-member-button"
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
          {members.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
              <p className="font-mono text-zinc-400">No members found</p>
            </Card>
          ) : (
            members.map((member) => (
              <Card
                key={member.member_id}
                data-testid={`member-card-${member.member_number}`}
                className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-6 rounded-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-1">Member #{member.member_number}</p>
                      <p className="font-display text-xl font-bold text-white">{member.name}</p>
                      <p className="text-sm text-zinc-400 mt-2">
                        {member.address}, {member.suburb} {member.postcode} {member.state}
                      </p>
                      {member.family_members && member.family_members.length > 0 && (
                        <p className="text-xs text-accent mt-2">
                          Family: {member.family_members.join(', ')}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-1">Contact</p>
                      {member.phone1 && <p className="text-sm text-zinc-300">{member.phone1}</p>}
                      {member.email1 && <p className="text-sm text-zinc-300">{member.email1}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-1">Status</p>
                      <div className="flex flex-wrap gap-2">
                        {member.financial && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs uppercase rounded-sm">
                            Financial
                          </span>
                        )}
                        {member.life_member && (
                          <span className="px-2 py-1 bg-primary/20 text-primary text-xs uppercase rounded-sm">
                            Life Member
                          </span>
                        )}
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs uppercase rounded-sm">
                          {member.membership_type}
                        </span>
                        <span className="px-2 py-1 bg-accent/20 text-accent text-xs uppercase rounded-sm">
                          {member.interest}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`edit-member-${member.member_number}`}
                      onClick={() => handleEdit(member)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:border-secondary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        data-testid={`delete-member-${member.member_number}`}
                        onClick={() => handleDelete(member.member_id)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 hover:border-red-500"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
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
            <DialogTitle className="font-display text-2xl text-white flex items-center justify-between">
              <span>{editingMember ? 'EDIT MEMBER' : 'NEW MEMBER'}</span>
              {editingMember && (
                <span className="text-primary text-lg">#{editingMember.member_number}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Suburb *</Label>
              <div className="relative">
                <Input
                  value={suburbInput}
                  onChange={(e) => {
                    setSuburbInput(e.target.value);
                    setShowSuburbDropdown(true);
                  }}
                  onFocus={() => setShowSuburbDropdown(true)}
                  placeholder="Type or select suburb"
                  className="bg-zinc-950 border-zinc-800"
                />
                {showSuburbDropdown && filteredSuburbs.length > 0 && suburbInput && (
                  <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-sm max-h-48 overflow-y-auto">
                    {filteredSuburbs.slice(0, 10).map((suburb, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSuburbInput(suburb);
                          setFormData({ ...formData, suburb: suburb });
                          setShowSuburbDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-zinc-800 cursor-pointer font-mono text-sm text-zinc-300"
                      >
                        {suburb}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Postcode *</Label>
              <Input
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="NSW">NSW</SelectItem>
                  <SelectItem value="VIC">VIC</SelectItem>
                  <SelectItem value="QLD">QLD</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="WA">WA</SelectItem>
                  <SelectItem value="TAS">TAS</SelectItem>
                  <SelectItem value="NT">NT</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Phone 1</Label>
              <Input
                value={formData.phone1}
                onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Phone 2</Label>
              <Input
                value={formData.phone2}
                onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Email 1</Label>
              <Input
                value={formData.email1}
                onChange={(e) => setFormData({ ...formData, email1: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 font-mono text-xs">Email 2</Label>
              <Input
                value={formData.email2}
                onChange={(e) => setFormData({ ...formData, email2: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Membership Type</Label>
              <Select
                value={formData.membership_type}
                onValueChange={(value) => setFormData({ ...formData, membership_type: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.membership_type === 'Family' && (
              <div className="md:col-span-2">
                <Label className="text-zinc-400 text-xs mb-2 block">Family Members</Label>
                <div className="space-y-2 p-4 bg-zinc-950 rounded-sm">
                  {(formData.family_members || []).map((member, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={member}
                        onChange={(e) => updateFamilyMember(index, e.target.value)}
                        placeholder="Family member name"
                        className="bg-zinc-900 border-zinc-800"
                      />
                      <Button
                        type="button"
                        onClick={() => removeFamilyMember(index)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 hover:border-red-500"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={addFamilyMember}
                    variant="outline"
                    className="w-full border-zinc-700 hover:border-primary uppercase"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Family Member
                  </Button>
                  <p className="text-xs text-zinc-500 mt-2">
                    Add names of other family members included in this membership
                  </p>
                </div>
              </div>
            )}

            {/* Membership Duration Buttons and Interest */}
            <div className="md:col-span-2">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label className="text-zinc-400 text-xs mb-2 block">Set Membership Duration</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const nextYear = today.getFullYear() + 1;
                        const expiryDate = `${nextYear}-05-31`;
                        setFormData({ 
                          ...formData, 
                          date_paid: today.toISOString().split('T')[0],
                          expiry_date: expiryDate,
                          financial: true
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="border-green-600 hover:bg-green-600/20 text-green-400"
                    >
                      1 Year
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        let datePaid = formData.date_paid ? new Date(formData.date_paid) : null;
                        const sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                        
                        if (!datePaid || datePaid < sixMonthsAgo) {
                          datePaid = today;
                        }
                        
                        const expiryYear = datePaid.getFullYear() + 2;
                        const expiryDate = `${expiryYear}-05-31`;
                        setFormData({ 
                          ...formData, 
                          date_paid: datePaid.toISOString().split('T')[0],
                          expiry_date: expiryDate,
                          financial: true
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="border-blue-600 hover:bg-blue-600/20 text-blue-400"
                    >
                      2 Years
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        let datePaid = formData.date_paid ? new Date(formData.date_paid) : null;
                        const sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                        
                        if (!datePaid || datePaid < sixMonthsAgo) {
                          datePaid = today;
                        }
                        
                        const expiryYear = datePaid.getFullYear() + 3;
                        const expiryDate = `${expiryYear}-05-31`;
                        setFormData({ 
                          ...formData, 
                          date_paid: datePaid.toISOString().split('T')[0],
                          expiry_date: expiryDate,
                          financial: true
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="border-purple-600 hover:bg-purple-600/20 text-purple-400"
                    >
                      3 Years
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-zinc-400 text-xs">Interest</Label>
                  <Select
                    value={formData.interest}
                    onValueChange={(value) => setFormData({ ...formData, interest: value })}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="Drag Racing">Drag Racing</SelectItem>
                      <SelectItem value="Car Enthusiast">Car Enthusiast</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date Paid and Expiry Date on same row */}
            <div>
              <Label className="text-zinc-400 text-xs">Date Paid</Label>
              <Input
                type="date"
                value={formData.date_paid}
                onChange={(e) => setFormData({ ...formData, date_paid: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-zinc-400 font-mono text-xs">Comments</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-sm">
              <Label className="text-zinc-400 font-mono text-xs">Life Member</Label>
              <Switch
                checked={formData.life_member}
                onCheckedChange={(checked) => setFormData({ ...formData, life_member: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-sm">
              <Label className="text-zinc-400 font-mono text-xs">Financial</Label>
              <Switch
                checked={formData.financial}
                onCheckedChange={(checked) => setFormData({ ...formData, financial: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-sm">
              <Label className="text-zinc-400 font-mono text-xs">Receive Emails</Label>
              <Switch
                checked={formData.receive_emails}
                onCheckedChange={(checked) => setFormData({ ...formData, receive_emails: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-sm">
              <Label className="text-zinc-400 font-mono text-xs">Receive SMS</Label>
              <Switch
                checked={formData.receive_sms}
                onCheckedChange={(checked) => setFormData({ ...formData, receive_sms: checked })}
              />
            </div>
          </div>

          {/* Vehicle Sub-Form Section - Only for existing members and full editors/admins */}
          {editingMember && canAccessVehicles && (
            <div className="mt-6 pt-6 border-t border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">VEHICLES</h3>
                <Button
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleFormData({
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
                    setShowVehicleDialog(true);
                  }}
                  size="sm"
                  className="bg-secondary hover:bg-secondary/90 text-zinc-900 uppercase"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Vehicle
                </Button>
              </div>

              {memberVehicles.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No vehicles registered for this member</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {memberVehicles.map((vehicle) => (
                    <div
                      key={vehicle.vehicle_id}
                      className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-primary font-bold">{vehicle.registration || 'No Rego'}</span>
                          <span className="text-zinc-400 text-sm">Log Book: {vehicle.log_book_number}</span>
                        </div>
                        <p className="text-white text-sm mt-1">
                          {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.body_style}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            vehicle.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
                          }`}>
                            {vehicle.status}
                          </span>
                          {vehicle.reason && (
                            <span className="text-zinc-500 text-xs">{vehicle.reason}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingVehicle(vehicle);
                            setVehicleFormData({
                              log_book_number: vehicle.log_book_number,
                              entry_date: vehicle.entry_date ? vehicle.entry_date.split('T')[0] : '',
                              expiry_date: vehicle.expiry_date ? vehicle.expiry_date.split('T')[0] : '',
                              make: vehicle.make,
                              body_style: vehicle.body_style,
                              model: vehicle.model,
                              year: vehicle.year,
                              registration: vehicle.registration,
                              status: vehicle.status,
                              reason: vehicle.reason || ''
                            });
                            setShowVehicleDialog(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 hover:border-secondary"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={async () => {
                            if (window.confirm('Archive this vehicle?')) {
                              try {
                                await axios.delete(`${BACKEND_URL}/api/vehicles/${vehicle.vehicle_id}`, {
                                  withCredentials: true
                                });
                                toast.success('Vehicle archived');
                                loadMemberVehicles(editingMember.member_id);
                              } catch (error) {
                                toast.error('Failed to archive vehicle');
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 hover:border-red-500"
                        >
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="border-zinc-700 uppercase"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-member-button"
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 uppercase"
            >
              {editingMember ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Add/Edit Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_raceroster/artifacts/brmlixop_Enthusiast%20Logo.jpg" 
                alt="Car Enthusiasts"
                className="w-12 h-12 object-contain rounded"
              />
              <DialogTitle className="text-xl text-white">
                {editingVehicle ? 'EDIT VEHICLE' : 'ADD VEHICLE'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-zinc-400 text-xs">Log Book Number *</Label>
              <Input
                value={vehicleFormData.log_book_number}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, log_book_number: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Registration *</Label>
              <Input
                value={vehicleFormData.registration}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, registration: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Make *</Label>
              <Input
                value={vehicleFormData.make}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Model *</Label>
              <Input
                value={vehicleFormData.model}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Body Style *</Label>
              <Input
                value={vehicleFormData.body_style}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, body_style: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Year *</Label>
              <Input
                type="number"
                value={vehicleFormData.year}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: parseInt(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            {/* Vehicle Duration Buttons */}
            <div className="md:col-span-2">
              <Label className="text-zinc-400 text-xs mb-2 block">Set Vehicle Registration Duration</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const nextYear = today.getFullYear() + 1;
                    const expiryDate = `${nextYear}-06-30`;
                    setVehicleFormData({ 
                      ...vehicleFormData, 
                      entry_date: today.toISOString().split('T')[0],
                      expiry_date: expiryDate
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-green-600 hover:bg-green-600/20 text-green-400"
                >
                  1 Year
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    let entryDate = vehicleFormData.entry_date ? new Date(vehicleFormData.entry_date) : null;
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    
                    if (!entryDate || entryDate < sixMonthsAgo) {
                      entryDate = today;
                    }
                    
                    const expiryYear = entryDate.getFullYear() + 2;
                    const expiryDate = `${expiryYear}-06-30`;
                    setVehicleFormData({ 
                      ...vehicleFormData, 
                      entry_date: entryDate.toISOString().split('T')[0],
                      expiry_date: expiryDate
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 hover:bg-blue-600/20 text-blue-400"
                >
                  2 Years
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    let entryDate = vehicleFormData.entry_date ? new Date(vehicleFormData.entry_date) : null;
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    
                    if (!entryDate || entryDate < sixMonthsAgo) {
                      entryDate = today;
                    }
                    
                    const expiryYear = entryDate.getFullYear() + 3;
                    const expiryDate = `${expiryYear}-06-30`;
                    setVehicleFormData({ 
                      ...vehicleFormData, 
                      entry_date: entryDate.toISOString().split('T')[0],
                      expiry_date: expiryDate
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-purple-600 hover:bg-purple-600/20 text-purple-400"
                >
                  3 Years
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Entry Date</Label>
              <Input
                type="date"
                value={vehicleFormData.entry_date}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, entry_date: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={vehicleFormData.expiry_date}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, expiry_date: e.target.value })}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Status</Label>
              <Select
                value={vehicleFormData.status}
                onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, status: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {vehicleOptions.statuses.length > 0 ? (
                    vehicleOptions.statuses.map(opt => (
                      <SelectItem key={opt.option_id} value={opt.value}>{opt.value}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Reason</Label>
              <Select
                value={vehicleFormData.reason}
                onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, reason: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {vehicleOptions.reasons.length > 0 ? (
                    vehicleOptions.reasons.map(opt => (
                      <SelectItem key={opt.option_id} value={opt.value}>{opt.value}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Blank">Blank</SelectItem>
                      <SelectItem value="Sold Vehicle">Sold Vehicle</SelectItem>
                      <SelectItem value="No Longer Financial">No Longer Financial</SelectItem>
                      <SelectItem value="Lost Log Book">Lost Log Book</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              onClick={() => setShowVehicleDialog(false)}
              variant="outline"
              className="border-zinc-700 uppercase"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (!vehicleFormData.log_book_number || !vehicleFormData.registration || !vehicleFormData.make || !vehicleFormData.model || !vehicleFormData.body_style) {
                    toast.error('Please fill in all required fields');
                    return;
                  }

                  const dataToSave = {
                    ...vehicleFormData,
                    member_id: editingMember.member_id,
                    entry_date: vehicleFormData.entry_date || null,
                    expiry_date: vehicleFormData.expiry_date || null
                  };

                  if (editingVehicle) {
                    await axios.put(
                      `${BACKEND_URL}/api/vehicles/${editingVehicle.vehicle_id}`,
                      dataToSave,
                      { withCredentials: true }
                    );
                    toast.success('Vehicle updated');
                  } else {
                    await axios.post(
                      `${BACKEND_URL}/api/vehicles`,
                      dataToSave,
                      { withCredentials: true }
                    );
                    toast.success('Vehicle added');
                  }
                  setShowVehicleDialog(false);
                  loadMemberVehicles(editingMember.member_id);
                  loadVehicleSearchData();
                } catch (error) {
                  toast.error('Failed to save vehicle');
                }
              }}
              className="bg-primary hover:bg-primary/90 uppercase"
            >
              {editingVehicle ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MembersPage;
