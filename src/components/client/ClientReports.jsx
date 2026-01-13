import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { firestoreService } from '../../services/firestoreService';

const ClientReports = ({ clientId, clientEmail }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    loadReports();
  }, [clientId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      // Load monthly reports for this client
      // TODO: Implement getReportsByClientId in firestoreService
      const clientReports = await firestoreService.getReportsByClient(clientId);
      
      if (clientReports && clientReports.length > 0) {
        setReports(clientReports);
      } else {
        // No reports found - start with empty array
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      // Start with empty array on error
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
      // Generate PDF or CSV report
      // For now, we'll create a simple text report
      const reportContent = generateReportContent(report);
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analytics_Report_${report.month.replace(' ', '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const generateReportContent = (report) => {
    return `
MONTHLY ANALYTICS REPORT
${report.month}
Generated: ${format(new Date(), 'MMMM d, yyyy')}

OVERVIEW METRICS
================
Total Users: ${report.metrics.totalUsers.toLocaleString()}
Page Views: ${report.metrics.pageViews.toLocaleString()}
Sessions: ${report.metrics.sessions.toLocaleString()}
Average Session Duration: ${report.metrics.avgSessionDuration}
Bounce Rate: ${report.metrics.bounceRate}%

PERFORMANCE SUMMARY
===================
This report provides a comprehensive overview of your website's performance 
for the month of ${report.month}. All metrics are based on Google Analytics data.

For questions or additional insights, please contact your media manager.
    `.trim();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Monthly Analytics Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and download your monthly performance reports
          </p>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{report.month}</h3>
                  <p className="text-xs text-gray-500">
                    {report.status === 'pending' ? 'In progress' : 'Completed'}
                  </p>
                </div>
              </div>
              {report.status === 'pending' && (
                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
              )}
            </div>

            {report.status === 'completed' && report.metrics && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Users</span>
                  <span className="font-semibold">{report.metrics.totalUsers.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Page Views</span>
                  <span className="font-semibold">{report.metrics.pageViews.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sessions</span>
                  <span className="font-semibold">{report.metrics.sessions.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {report.status === 'completed' && (
                <Button
                  onClick={() => handleDownloadReport(report.id)}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
              <Button
                onClick={() => setSelectedReport(report)}
                variant="outline"
                className="flex-1"
              >
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Analytics Report - {selectedReport.month}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Generated: {format(new Date(selectedReport.date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedReport(null)}
                >
                  ✕
                </Button>
              </div>

              {selectedReport.metrics && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Overview Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedReport.metrics.totalUsers.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Page Views</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedReport.metrics.pageViews.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedReport.metrics.sessions.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Avg. Session Duration</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedReport.metrics.avgSessionDuration}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleDownloadReport(selectedReport.id);
                        setSelectedReport(null);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                    <Button
                      onClick={() => setSelectedReport(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientReports;

