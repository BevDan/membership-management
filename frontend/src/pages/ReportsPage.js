import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Printer, Check, X, Car, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ReportsPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [filterType]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/reports/members`, {
        params: { filter_type: filterType },
        withCredentials: true
      });
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRowStyle = (member) => {
    // No vehicle + not financial = no highlight (default)
    // Financial + no vehicle = light green
    // Financial + has vehicle = darker green
    // Unfinancial + has vehicle = light orange
    
    if (member.financial && member.has_vehicle) {
      return 'bg-green-600/30'; // darker green
    } else if (member.financial && !member.has_vehicle) {
      return 'bg-green-500/20'; // light green
    } else if (!member.financial && member.has_vehicle) {
      return 'bg-orange-500/20'; // light orange
    }
    return ''; // no highlight
  };

  const filterLabels = {
    'all': 'All Members',
    'unfinancial': 'Unfinancial Members',
    'with_vehicle': 'Members with Vehicle',
    'unfinancial_with_vehicle': 'Unfinancial with Vehicle'
  };

  const exportToCSV = () => {
    if (members.length === 0) return;
    
    const headers = ['Member #', 'Name', 'Phone', 'Email', 'Financial', 'Has Vehicle'];
    const csvRows = [headers.join(',')];
    
    members.forEach(m => {
      const row = [
        m.member_number,
        `"${m.name.replace(/"/g, '""')}"`,
        `"${m.phone.replace(/"/g, '""')}"`,
        `"${m.email.replace(/"/g, '""')}"`,
        m.financial ? 'Yes' : 'No',
        m.has_vehicle ? 'Yes' : 'No'
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `member_report_${filterType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 border-b-4 border-primary shadow-lg print:hidden">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
              <h1 className="text-xl sm:text-2xl font-black text-white">
                MEMBER REPORTS
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium uppercase rounded"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium uppercase rounded"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 print:px-2 print:py-2">
        {/* Filter Controls - hidden when printing */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 mb-6 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="font-mono text-xs text-zinc-400 uppercase mb-2 block">Filter</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="unfinancial">Unfinancial Members</SelectItem>
                  <SelectItem value="with_vehicle">Members with at least one Vehicle</SelectItem>
                  <SelectItem value="unfinancial_with_vehicle">Unfinancial Members with Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-zinc-400">
                Showing <span className="text-white font-bold">{members.length}</span> members
              </p>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="font-mono text-xs text-zinc-500 uppercase mb-2">Row Color Legend</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600/30"></div>
                <span className="text-zinc-400">Financial + Has Vehicle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20"></div>
                <span className="text-zinc-400">Financial + No Vehicle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500/20"></div>
                <span className="text-zinc-400">Unfinancial + Has Vehicle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-700"></div>
                <span className="text-zinc-400">Unfinancial + No Vehicle</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Print Header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-black">Steel City Drags - {filterLabels[filterType]}</h1>
          <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()} | Total: {members.length} members</p>
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-700 print:border-black">
                  <th className="text-left py-2 px-3 font-mono text-xs uppercase text-zinc-400 print:text-black bg-zinc-900 print:bg-gray-200">
                    #
                  </th>
                  <th className="text-left py-2 px-3 font-mono text-xs uppercase text-zinc-400 print:text-black bg-zinc-900 print:bg-gray-200">
                    Name
                  </th>
                  <th className="text-left py-2 px-3 font-mono text-xs uppercase text-zinc-400 print:text-black bg-zinc-900 print:bg-gray-200">
                    Phone
                  </th>
                  <th className="text-left py-2 px-3 font-mono text-xs uppercase text-zinc-400 print:text-black bg-zinc-900 print:bg-gray-200">
                    Email
                  </th>
                  <th className="text-center py-2 px-3 font-mono text-xs uppercase text-zinc-400 print:text-black bg-zinc-900 print:bg-gray-200">
                    Financial
                  </th>
                  <th className="text-center py-2 px-3 font-mono text-xs uppercase text-zinc-400 print:text-black bg-zinc-900 print:bg-gray-200">
                    Vehicle
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr 
                    key={member.member_id} 
                    className={`border-b border-zinc-800 print:border-gray-300 ${getRowStyle(member)}`}
                  >
                    <td className="py-1.5 px-3 font-mono text-sm text-zinc-300 print:text-black">
                      {member.member_number}
                    </td>
                    <td className="py-1.5 px-3 text-sm text-white print:text-black font-medium">
                      {member.name}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-sm text-zinc-400 print:text-black">
                      {member.phone || '-'}
                    </td>
                    <td className="py-1.5 px-3 text-sm text-zinc-400 print:text-black">
                      {member.email || '-'}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {member.financial ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto print:text-green-700" />
                      ) : (
                        <X className="w-4 h-4 text-red-500 mx-auto print:text-red-700" />
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {member.has_vehicle ? (
                        <Car className="w-4 h-4 text-accent mx-auto print:text-blue-700" />
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {members.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-zinc-400">No members found matching the filter</p>
          </div>
        )}
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.5cm;
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
            font-size: 9pt;
          }
          tr {
            page-break-inside: avoid;
          }
          .bg-green-600\\/30 {
            background-color: #86efac !important;
          }
          .bg-green-500\\/20 {
            background-color: #bbf7d0 !important;
          }
          .bg-orange-500\\/20 {
            background-color: #fed7aa !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ReportsPage;
