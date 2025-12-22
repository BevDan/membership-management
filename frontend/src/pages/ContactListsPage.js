import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Mail, Phone, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ContactListsPage() {
  const navigate = useNavigate();
  
  // Email state
  const [emailFilter, setEmailFilter] = useState('all');
  const [emailList, setEmailList] = useState('');
  const [emailCount, setEmailCount] = useState(0);
  const [emailCopied, setEmailCopied] = useState(false);
  
  // SMS state
  const [smsFilter, setSmsFilter] = useState('all');
  const [smsList, setSmsList] = useState('');
  const [smsCount, setSmsCount] = useState(0);
  const [smsCopied, setSmsCopied] = useState(false);

  useEffect(() => {
    loadEmailList();
  }, [emailFilter]);

  useEffect(() => {
    loadSmsList();
  }, [smsFilter]);

  const loadEmailList = async () => {
    try {
      const params = { list_type: 'email' };
      if (emailFilter !== 'all') {
        params.interest = emailFilter;
      }
      const response = await axios.get(`${BACKEND_URL}/api/contact-lists`, {
        params,
        withCredentials: true
      });
      setEmailList(response.data.contacts);
      setEmailCount(response.data.count);
    } catch (error) {
      console.error('Failed to load email list:', error);
      toast.error('Failed to load email list');
    }
  };

  const loadSmsList = async () => {
    try {
      const params = { list_type: 'sms' };
      if (smsFilter !== 'all') {
        params.interest = smsFilter;
      }
      const response = await axios.get(`${BACKEND_URL}/api/contact-lists`, {
        params,
        withCredentials: true
      });
      setSmsList(response.data.contacts);
      setSmsCount(response.data.count);
    } catch (error) {
      console.error('Failed to load SMS list:', error);
      toast.error('Failed to load phone list');
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
      } else {
        setSmsCopied(true);
        setTimeout(() => setSmsCopied(false), 2000);
      }
      toast.success(`${type === 'email' ? 'Emails' : 'Phone numbers'} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b-4 border-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="sm"
              className="border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                CONTACT LISTS
              </h1>
              <p className="text-xs text-zinc-400">Export emails and phone numbers for campaigns</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Email List Section */}
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-primary p-6 rounded-sm">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-white">EMAIL LIST</h2>
            </div>
            
            <p className="text-sm text-zinc-400 mb-4">
              Active members who have opted in to receive emails
            </p>

            <div className="mb-4">
              <label className="text-xs text-zinc-400 uppercase mb-2 block">Filter by Interest</label>
              <Select value={emailFilter} onValueChange={setEmailFilter}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Interests</SelectItem>
                  <SelectItem value="Both">Both (Drag Racing & Car Enthusiast)</SelectItem>
                  <SelectItem value="Drag Racing">Drag Racing Only</SelectItem>
                  <SelectItem value="Car Enthusiast">Car Enthusiast Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-400 uppercase">
                  Emails ({emailCount} addresses)
                </label>
                <Button
                  onClick={() => copyToClipboard(emailList, 'email')}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 hover:border-primary"
                  disabled={!emailList}
                >
                  {emailCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>
              <textarea
                readOnly
                value={emailList}
                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-sm p-3 text-sm text-zinc-300 font-mono resize-none focus:outline-none focus:border-primary"
                placeholder="No emails found matching criteria"
              />
            </div>

            <p className="text-xs text-zinc-500">
              Copy and paste into your email client's BCC field
            </p>
          </Card>

          {/* SMS/Phone List Section */}
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-accent p-6 rounded-sm">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold text-white">PHONE LIST</h2>
            </div>
            
            <p className="text-sm text-zinc-400 mb-4">
              Active members who have opted in to receive SMS
            </p>

            <div className="mb-4">
              <label className="text-xs text-zinc-400 uppercase mb-2 block">Filter by Interest</label>
              <Select value={smsFilter} onValueChange={setSmsFilter}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Interests</SelectItem>
                  <SelectItem value="Both">Both (Drag Racing & Car Enthusiast)</SelectItem>
                  <SelectItem value="Drag Racing">Drag Racing Only</SelectItem>
                  <SelectItem value="Car Enthusiast">Car Enthusiast Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-400 uppercase">
                  Phone Numbers ({smsCount} numbers)
                </label>
                <Button
                  onClick={() => copyToClipboard(smsList, 'sms')}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 hover:border-accent"
                  disabled={!smsList}
                >
                  {smsCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>
              <textarea
                readOnly
                value={smsList}
                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-sm p-3 text-sm text-zinc-300 font-mono resize-none focus:outline-none focus:border-accent"
                placeholder="No phone numbers found matching criteria"
              />
            </div>

            <p className="text-xs text-zinc-500">
              Copy and paste into your SMS service
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default ContactListsPage;
