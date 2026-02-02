import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { cloudVisionOCRService } from '../services/cloudVisionOCRService';
// Fallback to browser-based OCR if Cloud Vision fails
import { instagramOCRService } from '../services/instagramOCRService';
import { getStorage, ref, deleteObject } from 'firebase/storage';
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
  ChevronUp,
  Sparkles,
  MapPin,
  Users,
  TrendingUp,
  Heart,
  MousePointer,
  MessageCircle,
  UserPlus,
  UserMinus,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight
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
      // Delete legacy screenshots from storage (only if they were ever uploaded)
      const storage = getStorage();
      for (const screenshot of report.screenshots || []) {
        if (!screenshot.path) continue;
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
                          <LinkIcon className="w-4 h-4" />
                          {report.postLinks?.length || 0} post links
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

                {/* Expanded: Post links & legacy screenshots */}
                {expandedReport === report.id && (
                  <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50 dark:bg-white/5">
                    {(report.postLinks?.length > 0) && (
                      <>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Post previews</h4>
                        <div className="space-y-2 mb-4">
                          {report.postLinks.map((link, index) => (
                            <div key={index} className="p-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                <LinkIcon className="w-4 h-4" />
                                {link.label || link.url || 'Link'}
                              </a>
                              {link.comment && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{link.comment}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {(report.screenshots?.length > 0) && (
                      <>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Screenshots (legacy)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {report.screenshots.map((screenshot, index) => (
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
                      </>
                    )}
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
    screenshots: [], // OCR only (not saved); editing loads no screenshots
    postLinks: report?.postLinks || [],
    metrics: report?.metrics || null
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0, status: '' });
  const [metricsSectionCollapsed, setMetricsSectionCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const hasAutoExtractedRef = useRef(false);

  // Reset auto-extract ref when opening create modal (new report)
  useEffect(() => {
    if (!report) hasAutoExtractedRef.current = false;
  }, [report]);

  // Auto-run extraction when screenshots are added
  useEffect(() => {
    if (
      formData.screenshots.length === 0 ||
      extracting ||
      hasAutoExtractedRef.current
    ) return;
    hasAutoExtractedRef.current = true;
    runExtraction();
  }, [formData.screenshots.length, extracting]);

  const runExtraction = async () => {
    if (formData.screenshots.length === 0) return;
    setExtracting(true);
    setExtractionProgress({ current: 0, total: formData.screenshots.length, status: 'Reading screenshots...' });
    try {
      const images = formData.screenshots.map(s => ({ localFile: s.localFile, url: s.previewUrl }));
      let metrics;
      try {
        metrics = await cloudVisionOCRService.processScreenshots(
          images,
          (current, total, status) => {
            setExtractionProgress({ current, total, status: status || `Processing screenshot ${current} of ${total}...` });
          }
        );
      } catch (cloudError) {
        console.warn('Cloud Vision failed, falling back to browser OCR:', cloudError);
        setExtractionProgress({ current: 0, total: formData.screenshots.length, status: 'Reading screenshots…' });
        const imageFiles = formData.screenshots.map(s => s.localFile || s.previewUrl);
        metrics = await instagramOCRService.processScreenshots(
          imageFiles,
          (current, total, status) => {
            setExtractionProgress({ current, total, status: status || `Processing screenshot ${current} of ${total}...` });
          }
        );
        await instagramOCRService.terminate();
      }
      setFormData(prev => {
        // Revoke object URLs so we don't leak memory, then dump screenshots (OCR-only)
        (prev.screenshots || []).forEach((s) => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
        return {
          ...prev,
          metrics: { ...(prev.metrics || {}), ...metrics },
          screenshots: []
        };
      });
    } catch (error) {
      console.error('Error extracting metrics:', error);
      hasAutoExtractedRef.current = false;
      // Dump screenshots even on error so user can re-add if needed
      setFormData(prev => {
        (prev.screenshots || []).forEach((s) => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
        return { ...prev, screenshots: [] };
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files?.length) return;

    setUploading(true);
    const newScreenshots = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        newScreenshots.push({
          localFile: file,
          name: file.name,
          previewUrl: URL.createObjectURL(file)
        });
      }

      setFormData(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...newScreenshots]
      }));
    } catch (error) {
      console.error('Error adding screenshots:', error);
      alert('Failed to add some files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleRemoveScreenshot = (index) => {
    const screenshot = formData.screenshots[index];
    if (screenshot.previewUrl) URL.revokeObjectURL(screenshot.previewUrl);

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

  // Update a specific metric value
  const updateMetric = (key, value) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [key]: value
      }
    }));
  };

  // Update nested metric (like gender.men)
  const updateNestedMetric = (parent, key, value) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [parent]: {
          ...(prev.metrics?.[parent] || {}),
          [key]: value
        }
      }
    }));
  };

  // Update array item (like topCities[0].percentage)
  const updateArrayMetric = (arrayKey, index, field, value) => {
    setFormData(prev => {
      const arr = [...(prev.metrics?.[arrayKey] || [])];
      if (arr[index]) {
        arr[index] = { ...arr[index], [field]: value };
      }
      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          [arrayKey]: arr
        }
      };
    });
  };

  // Add new item to array
  const addArrayItem = (arrayKey, template) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [arrayKey]: [...(prev.metrics?.[arrayKey] || []), template]
      }
    }));
  };

  // Remove item from array
  const removeArrayItem = (arrayKey, index) => {
    setFormData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [arrayKey]: (prev.metrics?.[arrayKey] || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.clientName || !formData.title || !formData.dateRange) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      // Build payload with only serializable data. Never include formData.screenshots (they hold File objects for OCR only).
      const clientName = String(formData.clientName ?? '');
      const title = String(formData.title ?? '');
      const dateRange = String(formData.dateRange ?? '');
      const notes = String(formData.notes ?? '');
      const postLinks = (formData.postLinks || []).map((l) => ({ url: String(l?.url ?? ''), label: String(l?.label ?? ''), comment: String(l?.comment ?? '') }));
      const metrics = formData.metrics ? JSON.parse(JSON.stringify(formData.metrics)) : null;

      if (report) {
        await firestoreService.updateInstagramReport(report.id, { clientName, title, dateRange, notes, postLinks, metrics });
      } else {
        await firestoreService.createInstagramReport({ clientName, title, dateRange, notes, postLinks, metrics });
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
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
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
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Monthly Performance"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
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
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Highlights / Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add insights, highlights, and recommendations for the client..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Screenshots for reading numbers only (not attached to report) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Screenshots (optional — for reading numbers only, not attached)
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
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
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Adding...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Drop screenshots to read numbers from them (optional)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Screenshots + extraction progress */}
            {formData.screenshots.length > 0 && (
              <div className="space-y-4">
                {extracting && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {extractionProgress.status}
                      </span>
                    </div>
                    <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${extractionProgress.total ? (extractionProgress.current / extractionProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploaded Screenshots ({formData.screenshots.length}){extracting ? ' — reading numbers from your screenshots…' : ''}
                  </h4>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {formData.screenshots.map((screenshot, index) => (
                    <div key={index} className="relative group border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                      <img
                        src={screenshot.previewUrl || screenshot.url}
                        alt={screenshot.name}
                        className="w-full h-28 object-cover"
                      />
                      {!extracting && (
                        <button
                          onClick={() => handleRemoveScreenshot(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics section — always visible; manual entry for missing fields */}
            <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <BarChart3 className="w-5 h-5" />
                    <span className="font-medium">Metrics</span>
                    <Badge className="bg-white/20 text-white text-xs">Add or edit any field below</Badge>
                  </div>
                  <button
                    onClick={() => setMetricsSectionCollapsed((c) => !c)}
                    className="text-white/80 hover:text-white"
                  >
                    {metricsSectionCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
                
                {!metricsSectionCollapsed && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 space-y-6">
                  {/* Key Metrics — manual entry for missing fields */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Key Metrics
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Numbers are read from your screenshots when possible; add or edit any field below.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Views</label>
                        <input
                          type="number"
                          value={formData.metrics?.views || ''}
                          onChange={(e) => updateMetric('views', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="16493"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Followers</label>
                        <input
                          type="number"
                          value={formData.metrics?.followers || ''}
                          onChange={(e) => updateMetric('followers', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="6649"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Interactions</label>
                        <input
                          type="number"
                          value={formData.metrics?.interactions || ''}
                          onChange={(e) => updateMetric('interactions', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="25"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profile Visits</label>
                        <input
                          type="number"
                          value={formData.metrics?.profileVisits || ''}
                          onChange={(e) => updateMetric('profileVisits', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="907"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accounts Reached</label>
                        <input
                          type="number"
                          value={formData.metrics?.accountsReached || ''}
                          onChange={(e) => updateMetric('accountsReached', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="858"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reach</label>
                        <input
                          type="number"
                          value={formData.metrics?.reach || ''}
                          onChange={(e) => updateMetric('reach', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Impressions</label>
                        <input
                          type="number"
                          value={formData.metrics?.impressions || ''}
                          onChange={(e) => updateMetric('impressions', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Saves</label>
                        <input
                          type="number"
                          value={formData.metrics?.saves || ''}
                          onChange={(e) => updateMetric('saves', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Shares</label>
                        <input
                          type="number"
                          value={formData.metrics?.shares || ''}
                          onChange={(e) => updateMetric('shares', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-gray-500">Views from Followers %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.viewsFollowerPercent || ''}
                          onChange={(e) => updateMetric('viewsFollowerPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="52.9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Follower Change</label>
                        <input
                          type="number"
                          value={formData.metrics?.followerChange || ''}
                          onChange={(e) => updateMetric('followerChange', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="-37"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profile Visits Change</label>
                        <input
                          type="text"
                          value={formData.metrics?.profileVisitsChange || ''}
                          onChange={(e) => updateMetric('profileVisitsChange', e.target.value)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="+147.1%"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Interactions from Followers %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.interactionsFollowerPercent || ''}
                          onChange={(e) => updateMetric('interactionsFollowerPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="94.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Accounts Reached Change</label>
                        <input
                          type="text"
                          value={formData.metrics?.accountsReachedChange || ''}
                          onChange={(e) => updateMetric('accountsReachedChange', e.target.value)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="-34.3%"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Engagement Rate %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.engagementRatePercent || ''}
                          onChange={(e) => updateMetric('engagementRatePercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Gender Split
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Men %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.gender?.men || ''}
                          onChange={(e) => updateNestedMetric('gender', 'men', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="52"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Women %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.metrics?.gender?.women || ''}
                          onChange={(e) => updateNestedMetric('gender', 'women', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="48"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Growth */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Follower Growth
                    </h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Net Change</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.overall || ''}
                          onChange={(e) => updateNestedMetric('growth', 'overall', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="-37"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">New Follows</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.follows || ''}
                          onChange={(e) => updateNestedMetric('growth', 'follows', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="6724"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Unfollows</label>
                        <input
                          type="number"
                          value={formData.metrics?.growth?.unfollows || ''}
                          onChange={(e) => updateNestedMetric('growth', 'unfollows', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                          placeholder="6761"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top Cities */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Top Cities
                      </h5>
                      <button
                        onClick={() => addArrayItem('topCities', { name: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add City
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.metrics?.topCities || []).map((city, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={city.name}
                            onChange={(e) => updateArrayMetric('topCities', idx, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="City name"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={city.percentage}
                            onChange={(e) => updateArrayMetric('topCities', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('topCities', idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Age Ranges */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Age Distribution
                      </h5>
                      <button
                        onClick={() => addArrayItem('ageRanges', { range: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add Range
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(formData.metrics?.ageRanges || []).map((age, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={age.range}
                            onChange={(e) => updateArrayMetric('ageRanges', idx, 'range', e.target.value)}
                            className="w-24 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="18-24"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={age.percentage}
                            onChange={(e) => updateArrayMetric('ageRanges', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('ageRanges', idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content Breakdown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Content Breakdown
                      </h5>
                      <button
                        onClick={() => addArrayItem('contentBreakdown', { type: '', percentage: 0 })}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        + Add Type
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(formData.metrics?.contentBreakdown || []).map((content, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={content.type}
                            onChange={(e) => updateArrayMetric('contentBreakdown', idx, 'type', e.target.value)}
                            className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="Posts"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={content.percentage}
                            onChange={(e) => updateArrayMetric('contentBreakdown', idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                            placeholder="%"
                          />
                          <button
                            onClick={() => removeArrayItem('contentBreakdown', idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}
              </div>

            {/* Instagram post links (shown on report as previews) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Social media post previews
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add Instagram post links and a comment about each piece of content for the report.
              </p>
              {(formData.postLinks || []).map((link, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-white/20 rounded-lg p-3 mb-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={link.url || ''}
                      onChange={(e) => {
                        const next = [...(formData.postLinks || [])];
                        next[idx] = { ...next[idx], url: e.target.value };
                        setFormData(prev => ({ ...prev, postLinks: next }));
                      }}
                      placeholder="https://www.instagram.com/p/..."
                      className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                    />
                    <input
                      type="text"
                      value={link.label || ''}
                      onChange={(e) => {
                        const next = [...(formData.postLinks || [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setFormData(prev => ({ ...prev, postLinks: next }));
                      }}
                      placeholder="Label (optional)"
                      className="w-28 px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, postLinks: (prev.postLinks || []).filter((_, i) => i !== idx) }))}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={link.comment || ''}
                    onChange={(e) => {
                      const next = [...(formData.postLinks || [])];
                      next[idx] = { ...next[idx], comment: e.target.value };
                      setFormData(prev => ({ ...prev, postLinks: next }));
                    }}
                    placeholder="Comment about this post (e.g. insight, performance note)"
                    rows={2}
                    className="w-full px-3 py-2 rounded border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm resize-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, postLinks: [...(prev.postLinks || []), { url: '', label: '', comment: '' }] }))}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add link
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!formData.title || !formData.clientName}
            className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Report
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="dark:border-white/20 dark:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading || extracting}
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
      </div>
      {/* Live Preview Modal */}
      {showPreview && (
        <ReportPreviewModal
          report={formData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

// Report Preview Modal - Shows live preview of the report being created/edited
const ReportPreviewModal = ({ report, onClose }) => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const screenshots = report.screenshots || [];
  const openLightbox = (index) => {
    if (screenshots[index]) {
      setLightboxIndex(index);
      setLightboxImage(screenshots[index]);
    }
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < screenshots.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(screenshots[newIndex]);
    }
  };

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxImage) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, lightboxIndex]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Preview Header */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <span className="font-medium">Report Preview</span>
            <Badge className="bg-white/20 text-white text-xs">Live</Badge>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
          {/* Hero Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTItNC00LTItNC0ycy0yIDItMiA0YzAgMiAyIDQgMiA0czIgMiA0IDJjMiA0IDQgMiA0IDJzMi0yIDItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />
            
            <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-16 pb-20 sm:pb-24">
              <div className="text-center text-white">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">{report.dateRange || 'Date Range'}</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                  {report.title || 'Report Title'}
                </h1>
                
                <div className="flex items-center justify-center gap-2 text-white/90 mb-6">
                  <User className="w-5 h-5" />
                  <span className="text-lg">{report.clientName || 'Client Name'}</span>
                </div>
              </div>
            </div>

            {/* Wave Decoration */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="rgb(250, 245, 255)" />
              </svg>
            </div>
          </div>

          {/* Key Metrics Overview */}
          {report.metrics && (
            <div className="max-w-4xl mx-auto px-6 -mt-6 relative z-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { 
                    icon: Eye, 
                    label: 'Total Views', 
                    value: report.metrics.views?.toLocaleString() || '—', 
                    color: 'from-purple-500 to-purple-600',
                    subtext: report.metrics.viewsFollowerPercent ? `${report.metrics.viewsFollowerPercent}% from followers` : null
                  },
                  { 
                    icon: Users, 
                    label: 'Followers', 
                    value: report.metrics.followers?.toLocaleString() || '—', 
                    color: 'from-pink-500 to-pink-600',
                    subtext: report.metrics.followerChange ? `${report.metrics.followerChange > 0 ? '+' : ''}${report.metrics.followerChange}` : null,
                    subtextColor: report.metrics.followerChange > 0 ? 'text-green-600' : 'text-red-500'
                  },
                  { 
                    icon: Heart, 
                    label: 'Interactions', 
                    value: report.metrics.interactions?.toLocaleString() || '—', 
                    color: 'from-orange-500 to-orange-600',
                    subtext: report.metrics.interactionsFollowerPercent ? `${report.metrics.interactionsFollowerPercent}% from followers` : null
                  },
                  { 
                    icon: MousePointer, 
                    label: 'Profile Visits', 
                    value: report.metrics.profileVisits?.toLocaleString() || '—', 
                    color: 'from-blue-500 to-blue-600',
                    subtext: report.metrics.profileVisitsChange ? `${report.metrics.profileVisitsChange}` : null,
                    subtextColor: report.metrics.profileVisitsChange?.startsWith?.('+') ? 'text-green-600' : 'text-red-500'
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-lg p-4"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    {stat.subtext && (
                      <p className={`text-xs mt-1 ${stat.subtextColor || 'text-gray-400'}`}>{stat.subtext}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {report.notes && (
            <div className="max-w-4xl mx-auto px-6 mt-8">
              <div className="bg-white rounded-xl shadow-lg p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  Report Highlights
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {report.notes}
                </p>
              </div>
            </div>
          )}

          {/* Instagram-style Insights (dark theme, graphs) */}
          {report.metrics && (
            <div className="max-w-4xl mx-auto px-6 mt-8">
              <div className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white shadow-xl">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-1">Insights</h2>
                  <p className="text-xs text-gray-400 mb-4">{report.dateRange}</p>

                  {/* Circular bars: Views & Interactions (Instagram-style) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                    {/* Views circular bar */}
                    {(report.metrics.views != null || report.metrics.viewsFollowerPercent != null) && (
                      <div className="flex flex-col items-center">
                        <div className="relative flex-shrink-0 w-[180px] h-[180px]">
                          <svg width="180" height="180" viewBox="0 0 200 200" className="transform -rotate-90 w-full h-full">
                            <circle cx="100" cy="100" r="78" fill="none" stroke="#2d2d2d" strokeWidth="28" />
                            <circle cx="100" cy="100" r="78" fill="none" stroke="#9C27B0" strokeWidth="28" strokeDasharray={`${(report.metrics.viewsFollowerPercent ?? 50) * 4.9} 490`} strokeLinecap="round" />
                            <circle cx="100" cy="100" r="78" fill="none" stroke="#E040FB" strokeWidth="28" strokeDasharray={`${(100 - (report.metrics.viewsFollowerPercent ?? 50)) * 4.9} 490`} strokeDashoffset={`-${(report.metrics.viewsFollowerPercent ?? 50) * 4.9}`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-gray-400 text-xs font-medium">Views</span>
                            <span className="text-2xl font-bold text-white mt-0.5">{report.metrics.views != null ? report.metrics.views.toLocaleString() : '—'}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#9C27B0]" />
                            <span className="text-xs text-gray-300">Followers</span>
                            <span className="text-xs font-semibold text-white">{report.metrics.viewsFollowerPercent ?? '—'}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E040FB]" />
                            <span className="text-xs text-gray-300">Non-followers</span>
                            <span className="text-xs font-semibold text-white">{report.metrics.nonFollowerPercent ?? (100 - (report.metrics.viewsFollowerPercent ?? 0)).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Interactions circular bar */}
                    {report.metrics.interactions != null && (
                      <div className="flex flex-col items-center">
                        <div className="relative flex-shrink-0 w-[180px] h-[180px]">
                          <svg width="180" height="180" viewBox="0 0 200 200" className="transform -rotate-90 w-full h-full">
                            <circle cx="100" cy="100" r="78" fill="none" stroke="#2d2d2d" strokeWidth="28" />
                            <circle cx="100" cy="100" r="78" fill="none" stroke="#E040FB" strokeWidth="28" strokeDasharray={`${((report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent) ?? 50) * 4.9} 490`} strokeLinecap="round" />
                            <circle cx="100" cy="100" r="78" fill="none" stroke="#7C4DFF" strokeWidth="28" strokeDasharray={`${(100 - ((report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent) ?? 50)) * 4.9} 490`} strokeDashoffset={`-${((report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent) ?? 50) * 4.9}`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-gray-400 text-xs font-medium">Interactions</span>
                            <span className="text-2xl font-bold text-white mt-0.5">{report.metrics.interactions.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E040FB]" />
                            <span className="text-xs text-gray-300">Followers</span>
                            <span className="text-xs font-semibold text-white">{report.metrics.interactionsFollowerPercent ?? report.metrics.viewsFollowerPercent ?? '—'}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#7C4DFF]" />
                            <span className="text-xs text-gray-300">Non-followers</span>
                            <span className="text-xs font-semibold text-white">{report.metrics.interactionsFollowerPercent != null ? (100 - report.metrics.interactionsFollowerPercent).toFixed(1) : report.metrics.viewsFollowerPercent != null ? (100 - report.metrics.viewsFollowerPercent).toFixed(1) : '—'}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top locations */}
                  {report.metrics.topCities && report.metrics.topCities.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#E040FB]" />
                        Top locations
                      </h3>
                      <div className="space-y-2">
                        {report.metrics.topCities.map((city, idx) => {
                          const maxPct = report.metrics.topCities[0]?.percentage || 100;
                          const barPct = Math.min(100, (city.percentage / maxPct) * 100);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-gray-200 w-24 flex-shrink-0">{city.name}</span>
                              <div className="flex-1 h-2.5 bg-[#2d2d2d] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-white w-10 text-right">{city.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Age range */}
                  {report.metrics.ageRanges && report.metrics.ageRanges.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#E040FB]" />
                        Age range
                      </h3>
                      <div className="space-y-2">
                        {report.metrics.ageRanges.map((range, idx) => {
                          const maxPct = report.metrics.ageRanges[0]?.percentage || 100;
                          const barPct = Math.min(100, (range.percentage / maxPct) * 100);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-gray-200 w-14 flex-shrink-0">{range.range}</span>
                              <div className="flex-1 h-2.5 bg-[#2d2d2d] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-white w-10 text-right">{range.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* By content type */}
                  {report.metrics.contentBreakdown && report.metrics.contentBreakdown.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-[#E040FB]" />
                        By content type
                      </h3>
                      <div className="space-y-2">
                        {report.metrics.contentBreakdown.map((item, idx) => {
                          const maxPct = report.metrics.contentBreakdown[0]?.percentage || 100;
                          const barPct = Math.min(100, (item.percentage / maxPct) * 100);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-gray-200 w-16 flex-shrink-0">{item.type}</span>
                              <div className="flex-1 h-2.5 bg-[#2d2d2d] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#E040FB] transition-all duration-500" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-white w-10 text-right">{item.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gender */}
                  {report.metrics.gender && (report.metrics.gender.men != null || report.metrics.gender.women != null) && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[#E040FB]" />
                        Gender
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300">Men</span>
                            <span className="font-medium text-white">{report.metrics.gender.men ?? 0}%</span>
                          </div>
                          <div className="h-2.5 bg-[#2d2d2d] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#E040FB]" style={{ width: `${report.metrics.gender.men ?? 0}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300">Women</span>
                            <span className="font-medium text-white">{report.metrics.gender.women ?? 0}%</span>
                          </div>
                          <div className="h-2.5 bg-[#2d2d2d] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#9C27B0]" style={{ width: `${report.metrics.gender.women ?? 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Growth */}
                  {report.metrics.growth && (report.metrics.growth.follows != null || report.metrics.growth.unfollows != null || report.metrics.growth.overall !== undefined) && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-[#E040FB]" />
                        Growth
                      </h3>
                      {(() => {
                        const follows = report.metrics.growth.follows ?? 0;
                        const unfollows = report.metrics.growth.unfollows ?? 0;
                        const netChange = report.metrics.growth.overall !== undefined ? report.metrics.growth.overall : (follows - unfollows);
                        return (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#2d2d2d] rounded-lg p-3 text-center">
                              <div className={`text-lg font-bold ${netChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}</div>
                              <p className="text-[10px] text-gray-400 mt-0.5">Overall</p>
                            </div>
                            <div className="bg-[#2d2d2d] rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-emerald-400">{follows.toLocaleString()}</div>
                              <p className="text-[10px] text-gray-400 mt-0.5">Follows</p>
                            </div>
                            <div className="bg-[#2d2d2d] rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-red-400">{unfollows.toLocaleString()}</div>
                              <p className="text-[10px] text-gray-400 mt-0.5">Unfollows</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Most active times */}
                  {report.metrics.activeTimes && report.metrics.activeTimes.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#E040FB]" />
                        Most active times
                      </h3>
                      <div className="flex items-end justify-between gap-0.5 h-20">
                        {report.metrics.activeTimes.map((time, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center min-w-0">
                            <div className="w-full max-w-[16px] mx-auto bg-[#E040FB] rounded-t transition-all duration-300" style={{ height: `${Math.max(4, time.activity || 0)}%` }} />
                            <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{time.hour}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Metrics Section */}
          {report.metrics && (
            <div className="max-w-4xl mx-auto px-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Content Performance */}
                {report.metrics.contentBreakdown && report.metrics.contentBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      Content Performance
                    </h3>
                    <div className="space-y-3">
                      {report.metrics.contentBreakdown.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{item.type}</span>
                            <span className="font-medium text-gray-900">{item.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Locations */}
                {report.metrics.topCities && report.metrics.topCities.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-pink-500" />
                      Top Locations
                    </h3>
                    <div className="space-y-2">
                      {report.metrics.topCities.map((city, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{city.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500"
                                style={{ width: `${(city.percentage / (report.metrics.topCities[0]?.percentage || 100)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-900 w-10 text-right">{city.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Age Demographics */}
                {report.metrics.ageRanges && report.metrics.ageRanges.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Age Distribution
                    </h3>
                    <div className="space-y-2">
                      {report.metrics.ageRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{range.range}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${(range.percentage / (report.metrics.ageRanges[0]?.percentage || 100)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-900 w-10 text-right">{range.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gender Split */}
                {report.metrics.gender && (report.metrics.gender.men || report.metrics.gender.women) && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      Audience Gender
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Men</span>
                          <span className="font-medium text-gray-900">{report.metrics.gender.men}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${report.metrics.gender.men}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Women</span>
                          <span className="font-medium text-gray-900">{report.metrics.gender.women}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full bg-gradient-to-r from-pink-400 to-pink-600"
                            style={{ width: `${report.metrics.gender.women}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Growth Metrics */}
                {report.metrics.growth && (report.metrics.growth.overall !== undefined || report.metrics.growth.follows || report.metrics.growth.unfollows) && (
                  <div className="bg-white rounded-xl shadow-lg p-5 lg:col-span-2">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Follower Growth
                    </h3>
                    {(() => {
                      // Auto-calculate net change if we have follows and unfollows
                      const follows = report.metrics.growth.follows || 0;
                      const unfollows = report.metrics.growth.unfollows || 0;
                      const netChange = report.metrics.growth.overall !== undefined && report.metrics.growth.overall !== 0
                        ? report.metrics.growth.overall 
                        : (follows - unfollows);
                      
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Net Change</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center justify-center gap-1">
                              <UserPlus className="w-4 h-4 text-green-600" />
                              <span className="text-2xl font-bold text-green-600">{follows.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">New Follows</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center justify-center gap-1">
                              <UserMinus className="w-4 h-4 text-red-500" />
                              <span className="text-2xl font-bold text-red-500">{unfollows.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Unfollows</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social media post previews (link + comment) */}
          {report.postLinks && report.postLinks.length > 0 && (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Instagram Content
                </h2>
                <p className="text-gray-600 text-sm">
                  Featured posts and notes from this period
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {report.postLinks.map((link, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 flex-shrink-0"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Instagram className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate group-hover:text-purple-600">
                          {link.label || 'View post'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{link.url}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </a>
                    {link.comment && (
                      <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 whitespace-pre-wrap">
                        {link.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy screenshots gallery */}
          {report.screenshots && report.screenshots.length > 0 && (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Analytics Screenshots
                </h2>
                <p className="text-gray-600 text-sm">
                  Detailed performance metrics from your Instagram account
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {report.screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    onClick={() => openLightbox(index)}
                    className="group bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={screenshot.url}
                        alt={screenshot.caption || `Screenshot ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {screenshot.caption && (
                      <div className="p-3">
                        <p className="text-sm text-gray-700">{screenshot.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state when no post links and no screenshots */}
          {(!report.postLinks || report.postLinks.length === 0) && (!report.screenshots || report.screenshots.length === 0) && (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="text-center py-12 bg-white/50 rounded-xl border-2 border-dashed border-gray-200">
                <LinkIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No post links added</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-8">
            <div className="max-w-4xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/Luxury-listings-logo-CLR.png" 
                    alt="Luxury Listings" 
                    className="h-6 w-auto"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Luxury Listings</p>
                    <p className="text-xs text-gray-500">Social Media Management</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Preview generated {format(new Date(), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {screenshots.length > 0 && lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          {screenshots.length > 0 && lightboxIndex < screenshots.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div 
            className="max-w-[90vw] max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || 'Screenshot'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              {lightboxIndex + 1} / {screenshots.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramReportsPage;
