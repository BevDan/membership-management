import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { ArrowLeft, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function BulkUploadPage({ user }) {
  const navigate = useNavigate();
  const [memberFile, setMemberFile] = useState(null);
  const [vehicleFile, setVehicleFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const canAccessVehicles = user && (user.role === 'admin' || user.role === 'full_editor');

  const handleMemberUpload = async () => {
    if (!memberFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', memberFile);

      const response = await axios.post(
        `${BACKEND_URL}/api/members/bulk-upload`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      toast.success(response.data.message);
      setMemberFile(null);
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleVehicleUpload = async () => {
    if (!vehicleFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', vehicleFile);

      const response = await axios.post(
        `${BACKEND_URL}/api/vehicles/bulk-upload`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      toast.success(response.data.message);
      setVehicleFile(null);
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const downloadMemberTemplate = () => {
    const headers = [
      'member_number', 'name', 'address', 'suburb', 'postcode', 'state', 'phone1', 'phone2',
      'email1', 'email2', 'life_member', 'financial', 'membership_type', 'family_members',
      'interest', 'date_paid', 'expiry_date', 'comments', 'receive_emails', 'receive_sms'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members_template.csv';
    a.click();
  };

  const downloadVehicleTemplate = () => {
    const headers = [
      'member_id', 'log_book_number', 'entry_date', 'expiry_date', 'make',
      'body_style', 'model', 'year', 'registration', 'status', 'reason'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicles_template.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-secondary shadow-lg sticky top-0 z-50">
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
                BULK UPLOAD
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-6 rounded-sm">
            <h2 className="font-display text-2xl font-black text-white mb-4">MEMBERS UPLOAD</h2>
            
            <div className="mb-4">
              <Button
                data-testid="download-member-template"
                onClick={downloadMemberTemplate}
                variant="outline"
                className="w-full border-zinc-700 hover:border-primary font-mono uppercase"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="mb-4">
              <Label className="text-zinc-400 font-mono text-xs uppercase mb-2 block">
                Select CSV File
              </Label>
              <input
                data-testid="member-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setMemberFile(e.target.files[0])}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-2 font-mono text-sm text-zinc-300"
              />
              {memberFile && (
                <p className="text-zinc-400 font-mono text-xs mt-2">
                  Selected: {memberFile.name}
                </p>
              )}
            </div>

            <Button
              data-testid="upload-members-button"
              onClick={handleMemberUpload}
              disabled={!memberFile || uploading}
              className="w-full bg-primary hover:bg-primary/90 font-mono uppercase"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Members'}
            </Button>

            <div className="mt-6 p-4 bg-zinc-950 rounded-sm">
              <p className="font-mono text-xs text-zinc-400 uppercase mb-2">CSV Format Notes:</p>
              <ul className="font-mono text-xs text-zinc-500 space-y-1">
                <li>• Required: name, address, suburb, postcode, state</li>
                <li>• member_number: Include existing numbers or leave blank</li>
                <li>• family_members: Separate names with semicolons (e.g., "Jane;John Jr")</li>
                <li>• Dates: YYYY-MM-DD format</li>
                <li>• Booleans: true/false or yes/no</li>
              </ul>
            </div>
          </Card>

          {canAccessVehicles && (
            <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-6 rounded-sm">
              <h2 className="font-display text-2xl font-black text-white mb-4">VEHICLES UPLOAD</h2>
              
              <div className="mb-4">
                <Button
                  data-testid="download-vehicle-template"
                  onClick={downloadVehicleTemplate}
                  variant="outline"
                  className="w-full border-zinc-700 hover:border-accent font-mono uppercase"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="mb-4">
                <Label className="text-zinc-400 font-mono text-xs uppercase mb-2 block">
                  Select CSV File
                </Label>
                <input
                  data-testid="vehicle-file-input"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setVehicleFile(e.target.files[0])}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-2 font-mono text-sm text-zinc-300"
                />
                {vehicleFile && (
                  <p className="text-zinc-400 font-mono text-xs mt-2">
                    Selected: {vehicleFile.name}
                  </p>
                )}
              </div>

              <Button
                data-testid="upload-vehicles-button"
                onClick={handleVehicleUpload}
                disabled={!vehicleFile || uploading}
                className="w-full bg-accent hover:bg-accent/90 text-zinc-900 font-mono uppercase"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Vehicles'}
              </Button>

              <div className="mt-6 p-4 bg-zinc-950 rounded-sm">
                <p className="font-mono text-xs text-zinc-400 uppercase mb-2">CSV Format Notes:</p>
                <ul className="font-mono text-xs text-zinc-500 space-y-1">
                  <li>• Use member_id from members export</li>
                  <li>• Required: member_id, log_book_number, make, model, year, registration</li>
                  <li>• Dates: YYYY-MM-DD format</li>
                  <li>• Status: Active, Cancelled, or Inactive</li>
                </ul>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default BulkUploadPage;
