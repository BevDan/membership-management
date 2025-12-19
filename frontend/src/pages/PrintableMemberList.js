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

  // Split members into two columns (left: odd index 0,2,4... right: odd index 1,3,5...)
  const leftColumn = members.filter((_, idx) => idx % 2 === 0);
  const rightColumn = members.filter((_, idx) => idx % 2 === 1);

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
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                MEMBER LIST
              </h1>
            </div>
            <Button
              type="button"
              onClick={() => window.print()}
              className="bg-orange-500 hover:bg-orange-600 uppercase"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Printable Content */}
      <main className="max-w-[1000px] mx-auto px-6 py-8 print:px-4 print:py-2 print:max-w-full">
        {/* Title for print */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-black">Steel City Drags - Member List</h1>
          <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-2 gap-8 print:gap-4">
          {/* Left Column */}
          <div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 px-2 font-bold text-sm uppercase bg-gray-200 text-black w-1/3">
                    No.
                  </th>
                  <th className="text-left py-2 px-2 font-bold text-sm uppercase bg-gray-200 text-black w-2/3">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {leftColumn.map((member, index) => (
                  <tr 
                    key={member.member_number} 
                    className={`border-b border-gray-400 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}
                  >
                    <td className="py-2 px-2 text-sm font-bold text-black">
                      {member.member_number}
                    </td>
                    <td className="py-2 px-2 text-sm text-black">
                      {member.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column */}
          <div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 px-2 font-bold text-sm uppercase bg-gray-200 text-black w-1/3">
                    No.
                  </th>
                  <th className="text-left py-2 px-2 font-bold text-sm uppercase bg-gray-200 text-black w-2/3">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {rightColumn.map((member, index) => (
                  <tr 
                    key={member.member_number} 
                    className={`border-b border-gray-400 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}
                  >
                    <td className="py-2 px-2 text-sm font-bold text-black">
                      {member.member_number}
                    </td>
                    <td className="py-2 px-2 text-sm text-black">
                      {member.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer for print */}
        <div className="hidden print:block mt-8 text-center text-sm text-gray-600">
          <p>Total Members: {members.length}</p>
        </div>

        {/* Screen footer */}
        <div className="print:hidden mt-8 text-center text-sm text-gray-500">
          <p>Total Members: {members.length}</p>
          <p className="mt-2">Click "Print" to generate a printable document</p>
        </div>
      </main>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            font-size: 10pt;
          }
          tr {
            page-break-inside: avoid;
          }
          td, th {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}

export default PrintableMemberList;
