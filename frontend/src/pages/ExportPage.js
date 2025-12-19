import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ExportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    receive_emails: null,
    receive_sms: null,
    interest: null
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const cleanFilters = {
        ...(filters.receive_emails !== null && { receive_emails: filters.receive_emails }),
        ...(filters.receive_sms !== null && { receive_sms: filters.receive_sms }),
        ...(filters.interest && { interest: filters.interest })
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/members/export`,
        cleanFilters,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export complete');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-primary shadow-lg sticky top-0 z-50">
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
                EXPORT DATA
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-8">
        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-8 rounded-sm">
          <h2 className="font-display text-2xl font-black text-white mb-6">MEMBER EXPORT FILTERS</h2>
          
          <div className="space-y-6">
            <div>
              <Label className="text-zinc-400 font-mono text-xs uppercase mb-2 block">
                Email Preference
              </Label>
              <div className="flex gap-4">
                <Button
                  data-testid="filter-email-all"
                  onClick={() => setFilters({ ...filters, receive_emails: null })}
                  variant={filters.receive_emails === null ? 'default' : 'outline'}
                  className={filters.receive_emails === null ? 'bg-primary' : 'border-zinc-700'}
                >
                  All
                </Button>
                <Button
                  data-testid="filter-email-yes"
                  onClick={() => setFilters({ ...filters, receive_emails: true })}
                  variant={filters.receive_emails === true ? 'default' : 'outline'}
                  className={filters.receive_emails === true ? 'bg-primary' : 'border-zinc-700'}
                >
                  Receives Emails
                </Button>
                <Button
                  data-testid="filter-email-no"
                  onClick={() => setFilters({ ...filters, receive_emails: false })}
                  variant={filters.receive_emails === false ? 'default' : 'outline'}
                  className={filters.receive_emails === false ? 'bg-primary' : 'border-zinc-700'}
                >
                  No Emails
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 font-mono text-xs uppercase mb-2 block">
                SMS Preference
              </Label>
              <div className="flex gap-4">
                <Button
                  data-testid="filter-sms-all"
                  onClick={() => setFilters({ ...filters, receive_sms: null })}
                  variant={filters.receive_sms === null ? 'default' : 'outline'}
                  className={filters.receive_sms === null ? 'bg-primary' : 'border-zinc-700'}
                >
                  All
                </Button>
                <Button
                  data-testid="filter-sms-yes"
                  onClick={() => setFilters({ ...filters, receive_sms: true })}
                  variant={filters.receive_sms === true ? 'default' : 'outline'}
                  className={filters.receive_sms === true ? 'bg-primary' : 'border-zinc-700'}
                >
                  Receives SMS
                </Button>
                <Button
                  data-testid="filter-sms-no"
                  onClick={() => setFilters({ ...filters, receive_sms: false })}
                  variant={filters.receive_sms === false ? 'default' : 'outline'}
                  className={filters.receive_sms === false ? 'bg-primary' : 'border-zinc-700'}
                >
                  No SMS
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 font-mono text-xs uppercase mb-2 block">
                Interest Filter
              </Label>
              <Select
                value={filters.interest || 'all'}
                onValueChange={(value) => setFilters({ ...filters, interest: value === 'all' ? null : value })}
              >
                <SelectTrigger data-testid="filter-interest" className="bg-zinc-950 border-zinc-800 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Interests</SelectItem>
                  <SelectItem value="Drag Racing">Drag Racing</SelectItem>
                  <SelectItem value="Car Enthusiast">Car Enthusiast</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 p-4 bg-zinc-950 rounded-sm">
            <p className="font-mono text-xs text-zinc-400 uppercase mb-2">Active Filters:</p>
            <ul className="font-mono text-xs text-zinc-300 space-y-1">
              {filters.receive_emails !== null && (
                <li>• Email preference: {filters.receive_emails ? 'Yes' : 'No'}</li>
              )}
              {filters.receive_sms !== null && (
                <li>• SMS preference: {filters.receive_sms ? 'Yes' : 'No'}</li>
              )}
              {filters.interest && (
                <li>• Interest: {filters.interest}</li>
              )}
              {filters.receive_emails === null && filters.receive_sms === null && !filters.interest && (
                <li className="text-zinc-500">No filters applied - exporting all members</li>
              )}
            </ul>
          </div>

          <Button
            data-testid="export-button"
            onClick={handleExport}
            disabled={exporting}
            className="w-full mt-6 bg-primary hover:bg-primary/90 font-mono uppercase py-6"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </Card>
      </main>
    </div>
  );
}

export default ExportPage;
