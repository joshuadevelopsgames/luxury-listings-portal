import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Instagram, 
  Plus, 
  Upload, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  Edit, 
  X,
  Image,
  Calendar,
  User,
  ExternalLink,
  BarChart3,
  AlertCircle,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

const InstagramReportsPage = () => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);

  // System admin check
  const isSystemAdmin = currentUser?.email === 'jrsschroeder@gmail.com';

  // Load reports
  useEffect(() => {
    const unsubscribe = firestoreService.onInstagramReportsChange((data) => {
      setReports(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCopyLink = (publicLinkId) => {
    const link = `${window.location.origin}/report/${publicLinkId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(publicLinkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Are you sure you want to delete "${report.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete screenshots from storage
      const storage = getStorage();
      for (const screenshot of report.screenshots || []) {
        try {
          const imageRef = ref(storage, screenshot.path);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('Error deleting screenshot:', e);
        }
      }

      // Delete the report document
      await firestoreService.deleteInstagramReport(report.id);
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  if (!isSystemAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Access Denied</h3>
                <p className="text-sm mt-1">This page is only accessible to system administrators.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Instagram className="w-8 h-8 text-pink-500" />
            Instagram Analytics Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create beautiful analytics reports from Instagram screenshots for your clients
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Instagram className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No reports yet</h3>
            <p className="text-gray-500 mt-2 mb-6">
              Create your first Instagram analytics report to share with clients
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {/* Report Header */}
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {report.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {report.clientName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {report.dateRange}
                        </span>
                        <span className="flex items-center gap-1">
                          <Image className="w-4 h-4" />
                          {report.screenshots?.length || 0} screenshots
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(report.publicLinkId)}
                      className="dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                    >
                      {copiedLink === report.publicLinkId ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/report/${report.publicLinkId}`, '_blank')}
                      className="dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingReport(report)}
                      className="dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReport(report)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-white/20 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                    >
                      {expandedReport === report.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Screenshots Preview */}
                {expandedReport === report.id && (
                  <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50 dark:bg-white/5">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Screenshots Preview</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {report.screenshots?.map((screenshot, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={screenshot.url}
                            alt={screenshot.caption || `Screenshot ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-white/10"
                          />
                          {screenshot.caption && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-2">
                              <p className="text-xs text-white text-center">{screenshot.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {report.notes && (
                      <div className="mt-4 p-4 bg-white dark:bg-white/10 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.notes}</p>
                      </div>
                    )}
                    <div className="mt-4 text-xs text-gray-500">
                      Created: {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'PPpp') : 'Unknown'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingReport) && (
        <ReportModal
          report={editingReport}
          onClose={() => {
            setShowCreateModal(false);
            setEditingReport(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingReport(null);
          }}
        />
      )}
    </div>
  );
};

// Report Create/Edit Modal Component
const ReportModal = ({ report, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    clientName: report?.clientName || '',
    title: report?.title || '',
    dateRange: report?.dateRange || '',
    notes: report?.notes || '',
    screenshots: report?.screenshots || []
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files?.length) return;

    setUploading(true);
    const storage = getStorage();
    const newScreenshots = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        const reportId = report?.id || `new-${Date.now()}`;
        const fileName = `${Date.now()}-${file.name}`;
        const storagePath = `instagram-reports/${reportId}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        newScreenshots.push({
          url,
          path: storagePath,
          name: file.name,
          caption: ''
        });
      }

      setFormData(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...newScreenshots]
      }));
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload some files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleRemoveScreenshot = async (index) => {
    const screenshot = formData.screenshots[index];
    
    // If it's an existing screenshot (has a path), delete from storage
    if (screenshot.path) {
      try {
        const storage = getStorage();
        const imageRef = ref(storage, screenshot.path);
        await deleteObject(imageRef);
      } catch (e) {
        console.warn('Error deleting screenshot from storage:', e);
      }
    }

    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateCaption = (index, caption) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.map((s, i) => 
        i === index ? { ...s, caption } : s
      )
    }));
  };

  const handleSave = async () => {
    if (!formData.clientName || !formData.title || !formData.dateRange) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.screenshots.length === 0) {
      alert('Please add at least one screenshot');
      return;
    }

    setSaving(true);

    try {
      if (report) {
        // Update existing report
        await firestoreService.updateInstagramReport(report.id, formData);
      } else {
        // Create new report
        await firestoreService.createInstagramReport(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {report ? 'Edit Report' : 'Create New Report'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="e.g., ABC Real Estate"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Report Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Monthly Instagram Performance Report"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range *
              </label>
              <input
                type="text"
                value={formData.dateRange}
                onChange={(e) => setFormData(prev => ({ ...prev, dateRange: e.target.value }))}
                placeholder="e.g., January 2026"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes or highlights for the client..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Screenshot Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Screenshots *
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                  ${dragOver 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-300 dark:border-white/20 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag and drop screenshots here, or click to browse
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Supports PNG, JPG, WEBP
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Screenshots Grid */}
            {formData.screenshots.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uploaded Screenshots ({formData.screenshots.length})
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {formData.screenshots.map((screenshot, index) => (
                    <div key={index} className="relative group border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                      <img
                        src={screenshot.url}
                        alt={screenshot.name}
                        className="w-full h-48 object-cover"
                      />
                      <button
                        onClick={() => handleRemoveScreenshot(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-3 bg-white dark:bg-[#1c1c1e]">
                        <input
                          type="text"
                          value={screenshot.caption}
                          onChange={(e) => handleUpdateCaption(index, e.target.value)}
                          placeholder="Add caption (optional)"
                          className="w-full text-sm px-2 py-1.5 rounded border border-gray-200 dark:border-white/10 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="dark:border-white/20 dark:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {report ? 'Save Changes' : 'Create Report'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstagramReportsPage;
