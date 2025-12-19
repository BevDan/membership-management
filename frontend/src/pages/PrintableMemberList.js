import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function PrintableMemberList() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/members/printable-list`, {
        withCredentials: true
      });
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - hidden when printing */}
      <header className="bg-zinc-900 border-b-4 border-orange-500 shadow-lg print:hidden">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="sm"
                className="font-mono border-zinc-700 text-white hover:bg-zinc-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="font-display text-xl sm:text-2xl font-black text-white">
                MEMBER LIST
              </h1>
            </div>
            <Button
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 font-mono uppercase"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Printable Content */}
      <main className="max-w-[800px] mx-auto px-6 py-8 print:px-4 print:py-2">
        {/* Title for print */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">Steel City Drags - Member List</h1>
          <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Two-column table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 px-3 font-bold text-sm uppercase bg-gray-100 print:bg-gray-200 w-1/4">
                Member #
              </th>
              <th className="text-left py-2 px-3 font-bold text-sm uppercase bg-gray-100 print:bg-gray-200 w-3/4">
                Name
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr 
                key={member.member_number} 
                className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="py-2 px-3 font-mono text-sm font-semibold">
                  {member.member_number}
                </td>
                <td className="py-2 px-3 text-sm">
                  {member.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer for print */}
        <div className="hidden print:block mt-8 text-center text-xs text-gray-400">
          <p>Total Members: {members.length}</p>
        </div>
      </main>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            font-size: 11pt;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default PrintableMemberList;
