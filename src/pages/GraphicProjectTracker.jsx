/**
 * GraphicProjectTracker - Project tracking for the Graphic Design team
 * 
 * Features:
 * - Year-based history (current year vs archived years)
 * - User-specific views (My Projects / Other's Projects / All)
 * - Sort preference per user (newest first / oldest first)
 * - Full CRUD for projects
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  Users,
  User,
  History,
  Upload,
  Palette,
  MoreHorizontal,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';

// Import data for one-time Excel import
import jasmineProjectsData from '../data/graphic-projects-import.json';
import joneProjectsData from '../data/jone-projects-full.json';
import { firestoreService } from '../services/firestoreService';
import { toast } from 'react-hot-toast';
import { format, parseISO, getYear } from 'date-fns';

// Priority configuration with Apple-style colors
const priorityConfig = {
  high: { 
    bg: 'bg-[#ff3b30]/10 dark:bg-[#ff453a]/20', 
    text: 'text-[#ff3b30] dark:text-[#ff453a]', 
    label: 'High',
    dot: 'bg-[#ff3b30]'
  },
  medium: { 
    bg: 'bg-[#ff9500]/10 dark:bg-[#ff9f0a]/20', 
    text: 'text-[#ff9500] dark:text-[#ff9f0a]', 
    label: 'Medium',
    dot: 'bg-[#ff9500]'
  },
  low: { 
    bg: 'bg-[#34c759]/10 dark:bg-[#30d158]/20', 
    text: 'text-[#34c759] dark:text-[#30d158]', 
    label: 'Low',
    dot: 'bg-[#34c759]'
  }
};

// Status configuration
const statusConfig = {
  not_started: { 
    bg: 'bg-[#8e8e93]/10 dark:bg-[#8e8e93]/20', 
    text: 'text-[#8e8e93]', 
    label: 'Not Started', 
    icon: Circle,
    color: '#8e8e93'
  },
  in_progress: { 
    bg: 'bg-[#007aff]/10 dark:bg-[#0a84ff]/20', 
    text: 'text-[#007aff] dark:text-[#0a84ff]', 
    label: 'In Progress', 
    icon: Loader2,
    color: '#007aff'
  },
  pending: { 
    bg: 'bg-[#ff9500]/10 dark:bg-[#ff9f0a]/20', 
    text: 'text-[#ff9500] dark:text-[#ff9f0a]', 
    label: 'Pending', 
    icon: Clock,
    color: '#ff9500'
  },
  completed: { 
    bg: 'bg-[#34c759]/10 dark:bg-[#30d158]/20', 
    text: 'text-[#34c759] dark:text-[#30d158]', 
    label: 'Completed', 
    icon: CheckCircle2,
    color: '#34c759'
  }
};

// Graphic team members (can be expanded)
const GRAPHIC_TEAM = [
  { email: 'jasmine@smmluxurylistings.com', name: 'Jasmine', defaultSort: 'newest' },
  { email: 'jone@smmluxurylistings.com', name: 'Jone', defaultSort: 'oldest' }
];

const GraphicProjectTracker = () => {
  const { currentUser, isSystemAdmin } = useAuth();
  const { confirm } = useConfirm();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Year filter - current year vs history
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  
  // User filter - whose projects to show
  const [userFilter, setUserFilter] = useState('all'); // 'mine', 'all', or specific email
  
  // Sort preference - stored in localStorage
  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('graphic-project-sort');
    if (saved) return saved;
    // Check if user has a default preference
    const teamMember = GRAPHIC_TEAM.find(m => 
      currentUser?.email?.toLowerCase().includes(m.email.split('@')[0].toLowerCase())
    );
    return teamMember?.defaultSort || 'newest';
  });
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  
  // Project requests state
  const [projectRequests, setProjectRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [declineRequestModal, setDeclineRequestModal] = useState({ open: false, request: null, reason: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    client: '',
    task: '',
    priority: 'medium',
    status: 'not_started',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    hours: '',
    notes: '',
    assignedTo: ''
  });
  
  // Request form state
  const [requestForm, setRequestForm] = useState({
    toUserEmail: '',
    client: '',
    task: '',
    priority: 'medium',
    deadline: '',
    notes: ''
  });

  // Determine current user's team info
  const currentTeamMember = useMemo(() => {
    return GRAPHIC_TEAM.find(m => 
      currentUser?.email?.toLowerCase().includes(m.email.split('@')[0].toLowerCase())
    );
  }, [currentUser?.email]);

  const otherTeamMembers = useMemo(() => {
    return GRAPHIC_TEAM.filter(m => 
      !currentUser?.email?.toLowerCase().includes(m.email.split('@')[0].toLowerCase())
    );
  }, [currentUser?.email]);

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  // Load project requests for designers
  useEffect(() => {
    if (!currentTeamMember) return;
    
    const loadRequests = async () => {
      try {
        const requests = await firestoreService.getProjectRequests(currentUser.email);
        const pendingRequests = (requests || []).filter(r => r.status === 'pending');
        setProjectRequests(pendingRequests);
      } catch (error) {
        console.error('Error loading project requests:', error);
      }
    };
    
    loadRequests();
  }, [currentUser?.email, currentTeamMember]);

  // Save sort preference
  useEffect(() => {
    localStorage.setItem('graphic-project-sort', sortOrder);
  }, [sortOrder]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await firestoreService.getGraphicProjects();
      setProjects(data);
      
      // Calculate available years from data
      const years = new Set([currentYear]);
      data.forEach(p => {
        if (p.startDate) {
          const year = getYear(typeof p.startDate === 'string' ? parseISO(p.startDate) : p.startDate.toDate?.() || new Date(p.startDate));
          years.add(year);
        }
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];
    
    // Year filter
    filtered = filtered.filter(p => {
      if (!p.startDate) return selectedYear === currentYear;
      const projectYear = getYear(typeof p.startDate === 'string' ? parseISO(p.startDate) : p.startDate.toDate?.() || new Date(p.startDate));
      return projectYear === selectedYear;
    });
    
    // User filter
    if (userFilter === 'mine' && currentTeamMember) {
      filtered = filtered.filter(p => 
        p.assignedTo?.toLowerCase().includes(currentTeamMember.email.split('@')[0].toLowerCase())
      );
    } else if (userFilter !== 'all' && userFilter !== 'mine') {
      filtered = filtered.filter(p => 
        p.assignedTo?.toLowerCase().includes(userFilter.split('@')[0].toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.client?.toLowerCase().includes(query) ||
        p.task?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query)
      );
    }
    
    // Sort: incomplete first, then by priority, then by date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { not_started: 0, pending: 1, in_progress: 2, completed: 3 };
    
    filtered.sort((a, b) => {
      // 1. Incomplete projects first (completed goes to bottom)
      const statusA = statusOrder[a.status] ?? 1;
      const statusB = statusOrder[b.status] ?? 1;
      if (statusA !== statusB) return statusA - statusB;
      
      // 2. Higher priority first
      const priorityA = priorityOrder[a.priority] ?? 1;
      const priorityB = priorityOrder[b.priority] ?? 1;
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // 3. Then by date
      const dateA = a.startDate ? new Date(typeof a.startDate === 'string' ? a.startDate : a.startDate.toDate?.() || a.startDate) : new Date(0);
      const dateB = b.startDate ? new Date(typeof b.startDate === 'string' ? b.startDate : b.startDate.toDate?.() || b.startDate) : new Date(0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [projects, selectedYear, userFilter, statusFilter, searchQuery, sortOrder, currentTeamMember, currentYear]);

  // Stats
  // Stats based on filtered projects (reflects current view)
  const stats = useMemo(() => {
    return {
      total: filteredProjects.length,
      completed: filteredProjects.filter(p => p.status === 'completed').length,
      inProgress: filteredProjects.filter(p => p.status === 'in_progress').length,
      pending: filteredProjects.filter(p => p.status === 'pending' || p.status === 'not_started').length,
      totalHours: filteredProjects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)
    };
  }, [filteredProjects]);

  const handleAddProject = async () => {
    if (!form.client || !form.task) {
      toast.error('Client and Task are required');
      return;
    }
    
    setSaving(true);
    try {
      const projectData = {
        ...form,
        hours: parseFloat(form.hours) || 0,
        assignedTo: form.assignedTo || currentUser?.email || '',
        createdBy: currentUser?.email || '',
        createdAt: new Date().toISOString()
      };
      
      await firestoreService.addGraphicProject(projectData);
      toast.success('Project added!');
      setShowAddModal(false);
      resetForm();
      loadProjects();
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to add project');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProject = async () => {
    if (!form.client || !form.task) {
      toast.error('Client and Task are required');
      return;
    }
    
    setSaving(true);
    try {
      const projectData = {
        ...form,
        hours: parseFloat(form.hours) || 0,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || ''
      };
      
      await firestoreService.updateGraphicProject(editingProject.id, projectData);
      toast.success('Project updated!');
      setShowEditModal(false);
      setEditingProject(null);
      resetForm();
      loadProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (project) => {
    const confirmed = await confirm({
      title: 'Delete Project',
      message: `Delete project "${project.task}" for ${project.client}?`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await firestoreService.deleteGraphicProject(project.id);
      toast.success('Project deleted');
      loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  // One-time import from Excel data (admin only)
  // Clear all projects and reimport from both Excel files
  const handleClearAndReimport = async () => {
    if (!currentUser || !isSystemAdmin) {
      toast.error('Admin access required');
      return;
    }

    const allProjects = [...jasmineProjectsData, ...joneProjectsData];
    const jasmineCount = jasmineProjectsData.length;
    const joneCount = joneProjectsData.length;

    const importConfirmed = await confirm({
      title: 'Clear & Reimport All Projects',
      message: `This will DELETE all ${projects.length} existing projects and reimport ${allProjects.length} projects (${jasmineCount} Jasmine, ${joneCount} Jone). This cannot be undone.`,
      confirmText: 'Clear & Reimport',
      variant: 'danger'
    });
    if (!importConfirmed) return;

    setImporting(true);
    
    // Step 1: Delete all existing projects
    toast.loading('Deleting existing projects...', { id: 'import-toast' });
    let deleted = 0;
    for (const project of projects) {
      try {
        await firestoreService.deleteGraphicProject(project.id);
        deleted++;
        if (deleted % 20 === 0) {
          toast.loading(`Deleting... ${deleted}/${projects.length}`, { id: 'import-toast' });
        }
      } catch (err) {
        console.error('Error deleting project:', err);
      }
    }
    
    // Step 2: Import all projects
    toast.loading(`Importing... 0/${allProjects.length}`, { id: 'import-toast' });
    let imported = 0;
    let failed = 0;
    
    for (const project of allProjects) {
      try {
        const projectData = {
          client: project.client || '',
          task: project.task || '',
          priority: project.priority || 'medium',
          status: project.status || 'not_started',
          startDate: project.startDate || null,
          endDate: project.endDate || null,
          hours: project.hours || 0,
          notes: project.notes || '',
          assignedTo: project.assignedTo,
          importedFromExcel: true,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email
        };
        
        await firestoreService.addGraphicProject(projectData);
        imported++;
        
        if (imported % 20 === 0) {
          toast.loading(`Importing... ${imported}/${allProjects.length}`, { id: 'import-toast' });
        }
      } catch (err) {
        console.error('Failed to import:', project.client, '-', err.message);
        failed++;
        if (failed >= 5 && imported === 0) {
          toast.error('Permission denied. Check Firestore rules.', { id: 'import-toast' });
          setImporting(false);
          return;
        }
      }
    }
    
    setImporting(false);
    toast.success(`Imported ${imported} projects (${failed} failed)`, { id: 'import-toast' });
    loadProjects();
  };

  const handleImportFromExcel = async () => {
    console.log('=== IMPORT V2 ===');
    const allProjects = [...jasmineProjectsData, ...joneProjectsData];
    console.log('Import button clicked, total projects:', allProjects.length);
    console.log('Current user:', currentUser?.email, currentUser?.uid);
    
    if (!currentUser) {
      toast.error('You must be logged in to import');
      return;
    }
    
    const importConfirmed = await confirm({
      title: 'Import Projects',
      message: `Import ${allProjects.length} projects (${jasmineProjectsData.length} Jasmine, ${joneProjectsData.length} Jone)? This will add new records.`,
      confirmText: 'Import',
      variant: 'default'
    });
    if (!importConfirmed) {
      console.log('User cancelled import');
      return;
    }
    
    console.log('Starting import v2...');
    setImporting(true);
    
    let imported = 0;
    let failed = 0;
    const errors = [];
    
    toast.loading(`Importing... 0/${allProjects.length}`, { id: 'import-toast' });
    
    // Import one at a time with detailed error logging
    for (let i = 0; i < allProjects.length; i++) {
      const project = allProjects[i];
      try {
        const projectData = {
          client: project.client || '',
          task: project.task || '',
          priority: project.priority || 'medium',
          status: project.status || 'not_started',
          startDate: project.startDate || null,
          endDate: project.endDate || null,
          hours: project.hours || 0,
          notes: project.notes || '',
          assignedTo: project.assignedTo,
          importedFromExcel: true,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email
        };
        
        await firestoreService.addGraphicProject(projectData);
        imported++;
        
        // Update progress every 10 items
        if (imported % 10 === 0) {
          toast.loading(`Importing... ${imported}/${allProjects.length}`, { id: 'import-toast' });
        }
      } catch (err) {
        console.error(`Failed to import project ${i}:`, project.client, '-', err.message);
        errors.push({ index: i, client: project.client, error: err.message });
        failed++;
        
        // Stop after 3 consecutive errors (likely a permissions issue)
        if (failed >= 3 && imported === 0) {
          toast.error('Permission denied. Please check Firestore rules are deployed.', { id: 'import-toast' });
          setImporting(false);
          return;
        }
      }
    }
    
    setImporting(false);
    
    if (failed > 0) {
      console.log('Import errors:', errors);
      toast.success(`Imported ${imported} projects (${failed} failed)`, { id: 'import-toast' });
    } else {
      toast.success(`Successfully imported ${imported} projects!`, { id: 'import-toast' });
    }
    
    loadProjects();
  };

  // One-time reassign Jone's projects (admin only)
  const handleReassignJone = async () => {
    if (!currentUser || !isSystemAdmin) {
      toast.error('Admin access required');
      return;
    }
    
    // Build a set of client+task combinations that belong to Jone
    const joneSet = new Set(
      joneProjectsData.map(p => `${p.client.toLowerCase()}|${p.task.toLowerCase()}`)
    );
    
    // Find matching projects in our loaded data
    const toReassign = projects.filter(p => {
      const key = `${(p.client || '').toLowerCase()}|${(p.task || '').toLowerCase()}`;
      return joneSet.has(key) && p.assignedTo !== 'jone@smmluxurylistings.com';
    });
    
    if (toReassign.length === 0) {
      toast.success('All projects already assigned correctly!');
      return;
    }
    
    const reassignConfirmed = await confirm({
      title: 'Reassign Projects',
      message: `Reassign ${toReassign.length} projects to Jone?`,
      confirmText: 'Reassign',
      variant: 'default'
    });
    if (!reassignConfirmed) {
      return;
    }
    
    setImporting(true);
    toast.loading(`Reassigning... 0/${toReassign.length}`, { id: 'reassign-toast' });
    
    let updated = 0;
    for (const project of toReassign) {
      try {
        await firestoreService.updateGraphicProject(project.id, {
          assignedTo: 'jone@smmluxurylistings.com',
          updatedAt: new Date().toISOString()
        });
        updated++;
        if (updated % 10 === 0) {
          toast.loading(`Reassigning... ${updated}/${toReassign.length}`, { id: 'reassign-toast' });
        }
      } catch (err) {
        console.error('Failed to reassign:', project.id, err);
      }
    }
    
    setImporting(false);
    toast.success(`Reassigned ${updated} projects to Jone!`, { id: 'reassign-toast' });
    loadProjects();
  };

  const handleStatusChange = async (project, newStatus) => {
    try {
      await firestoreService.updateGraphicProject(project.id, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, status: newStatus } : p
      ));
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Submit project request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!requestForm.deadline) {
      toast.error('Deadline is required');
      return;
    }
    
    if (!requestForm.toUserEmail) {
      toast.error('Please select a designer');
      return;
    }
    
    setSubmittingRequest(true);
    try {
      const designer = GRAPHIC_TEAM.find(m => m.email === requestForm.toUserEmail);
      
      await firestoreService.createProjectRequest({
        fromUserEmail: currentUser.email,
        fromUserName: currentUser.displayName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        toUserEmail: requestForm.toUserEmail,
        toUserName: designer?.name || requestForm.toUserEmail,
        client: requestForm.client,
        task: requestForm.task,
        priority: requestForm.priority,
        deadline: requestForm.deadline,
        notes: requestForm.notes
      });
      
      toast.success(`Project request sent to ${designer?.name || 'designer'}!`);
      setShowRequestModal(false);
      setRequestForm({
        toUserEmail: '',
        client: '',
        task: '',
        priority: 'medium',
        deadline: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error sending project request:', error);
      toast.error('Failed to send request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Accept project request
  const handleAcceptRequest = async (request) => {
    if (processingRequestId) return;
    
    try {
      setProcessingRequestId(request.id);
      await firestoreService.acceptProjectRequest(request.id, request);
      
      setProjectRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Project request accepted!');
      loadProjects();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Reject project request (reason from decline modal)
  const handleRejectRequest = async (request, reason = '') => {
    if (processingRequestId) return;
    try {
      setProcessingRequestId(request.id);
      setDeclineRequestModal(prev => ({ ...prev, open: false, request: null }));
      await firestoreService.rejectProjectRequest(request.id, request, reason || '');
      setProjectRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Project request declined');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setForm({
      client: project.client || '',
      task: project.task || '',
      priority: project.priority || 'medium',
      status: project.status || 'not_started',
      startDate: project.startDate ? format(typeof project.startDate === 'string' ? parseISO(project.startDate) : project.startDate.toDate?.() || new Date(project.startDate), 'yyyy-MM-dd') : '',
      endDate: project.endDate ? format(typeof project.endDate === 'string' ? parseISO(project.endDate) : project.endDate.toDate?.() || new Date(project.endDate), 'yyyy-MM-dd') : '',
      hours: project.hours?.toString() || '',
      notes: project.notes || '',
      assignedTo: project.assignedTo || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setForm({
      client: '',
      task: '',
      priority: 'medium',
      status: 'not_started',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      hours: '',
      notes: '',
      assignedTo: currentUser?.email || GRAPHIC_TEAM[0]?.email || ''
    });
  };

  const formatDate = (date) => {
    if (!date) return null;
    try {
      const d = typeof date === 'string' ? parseISO(date) : date.toDate?.() || new Date(date);
      return format(d, 'MMM d');
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f]">
      {/* Header with backdrop blur */}
      <div className="sticky top-0 z-10 bg-[#f5f5f7]/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#af52de] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#af52de]/25">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[22px] sm:text-[28px] font-bold text-[#1d1d1f] dark:text-white tracking-tight">
                  Team Projects
                </h1>
                <p className="text-[13px] text-[#86868b]">
                  Design Team • {stats.total} projects
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Show pending requests count for designers */}
              {currentTeamMember && projectRequests.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff9500]/10 text-[#ff9500]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[13px] font-medium">{projectRequests.length} pending</span>
                </div>
              )}
              
              {/* Add Project button for designers and admins */}
              {(currentTeamMember || isSystemAdmin) && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Project</span>
                </button>
              )}
              
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Year Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                selectedYear === year
                  ? 'bg-[#0071e3] text-white'
                  : 'bg-white dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/15 border border-black/5 dark:border-white/10'
              }`}
            >
              {year === currentYear ? (
                <>
                  <Calendar className="w-4 h-4" />
                  {year}
                </>
              ) : (
                <>
                  <History className="w-4 h-4" />
                  {year}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#1d1d1f]/10 dark:bg-white/10 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5 text-[#1d1d1f] dark:text-white" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Total</p>
            </div>
            <p className="text-[28px] font-bold text-[#1d1d1f] dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#34c759]/10 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Done</p>
            </div>
            <p className="text-[28px] font-bold text-[#34c759]">{stats.completed}</p>
          </div>
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#007aff]/10 flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-[#007aff]" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Active</p>
            </div>
            <p className="text-[28px] font-bold text-[#007aff]">{stats.inProgress}</p>
          </div>
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#ff9500]/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-[#ff9500]" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Pending</p>
            </div>
            <p className="text-[28px] font-bold text-[#ff9500]">{stats.pending}</p>
          </div>
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#af52de]/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-[#af52de]" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Hours</p>
            </div>
            <p className="text-[28px] font-bold text-[#af52de]">{stats.totalHours.toFixed(0)}</p>
          </div>
        </div>

        {/* Pending Project Requests - Only show to designers */}
        {currentTeamMember && projectRequests.length > 0 && (
          <div className="bg-gradient-to-r from-[#ff9500]/10 to-[#ff3b30]/10 backdrop-blur-xl rounded-2xl p-5 border border-[#ff9500]/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-[#ff9500]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                Pending Project Requests ({projectRequests.length})
              </h3>
            </div>
            <div className="space-y-3">
              {projectRequests.map(request => (
                <div key={request.id} className="bg-white/80 dark:bg-white/10 rounded-xl p-4 border border-black/5 dark:border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">{request.task}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          request.priority === 'high' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                          request.priority === 'medium' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                          'bg-[#34c759]/10 text-[#34c759]'
                        }`}>
                          {request.priority}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#86868b] mb-1">
                        <span className="font-medium text-[#1d1d1f] dark:text-white">{request.client}</span>
                        {' • '}Requested by {request.fromUserName}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#86868b]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Deadline: {request.deadline ? format(parseISO(request.deadline), 'MMM d, yyyy') : 'Not set'}
                        </span>
                      </div>
                      {request.notes && (
                        <p className="text-[12px] text-[#86868b] mt-2 italic">"{request.notes}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request)}
                        disabled={processingRequestId === request.id}
                        className="h-9 px-4 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#2db14e] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {processingRequestId === request.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => setDeclineRequestModal({ open: true, request, reason: '' })}
                        disabled={processingRequestId === request.id}
                        className="h-9 px-4 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decline project request reason modal */}
        {declineRequestModal.open && declineRequestModal.request && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Decline request</h3>
                <button type="button" onClick={() => setDeclineRequestModal({ open: false, request: null, reason: '' })} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
              <p className="text-[13px] text-[#86868b] dark:text-gray-400 mb-3">Why are you declining this request? (Optional)</p>
              <textarea
                value={declineRequestModal.reason}
                onChange={(e) => setDeclineRequestModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for declining..."
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setDeclineRequestModal({ open: false, request: null, reason: '' })} className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15">Cancel</button>
                <button type="button" onClick={() => handleRejectRequest(declineRequestModal.request, declineRequestModal.reason)} className="flex-1 px-4 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#e5342b]">Decline</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Filters Bar */}
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-black/5 dark:border-white/10">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            
            {/* User Filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {/* Show "My Projects" only if current user is a team member */}
              {currentTeamMember && (
                <button
                  onClick={() => setUserFilter('mine')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
                    userFilter === 'mine'
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  My Projects
                </button>
              )}
              {/* If current user is a team member, show other members; otherwise show all team members */}
              {currentTeamMember ? (
                // Show other team members (not the current user)
                otherTeamMembers.map(member => (
                  <button
                    key={member.email}
                    onClick={() => setUserFilter(member.email)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
                      userFilter === member.email
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    {member.name}'s
                  </button>
                ))
              ) : (
                // Show all team members for non-team viewers
                GRAPHIC_TEAM.map(member => (
                  <button
                    key={member.email}
                    onClick={() => setUserFilter(member.email)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
                      userFilter === member.email
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    {member.name}'s
                  </button>
                ))
              )}
              <button
                onClick={() => setUserFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
                  userFilter === 'all'
                    ? 'bg-[#0071e3] text-white'
                    : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                All
              </button>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            
            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-black/5 dark:bg-white/10 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-all whitespace-nowrap"
            >
              {sortOrder === 'newest' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#0071e3]" />
            <p className="text-[14px] text-[#86868b]">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#86868b]/10 flex items-center justify-center">
              <Palette className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">No projects found</p>
            <p className="text-[14px] text-[#86868b] mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Add a new project to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Project
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.not_started;
              const priority = priorityConfig[project.priority] || priorityConfig.medium;
              const StatusIcon = status.icon;
              const isExpanded = expandedProject === project.id;
              
              return (
                <div 
                  key={project.id}
                  className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 transition-all"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div 
                        className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center flex-shrink-0`}
                      >
                        <StatusIcon className={`w-5 h-5 ${status.text}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                                {project.client || 'No Client'}
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${priority.bg} ${priority.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                                {priority.label}
                              </span>
                            </div>
                            <p className="text-[14px] text-[#1d1d1f] dark:text-white/90 line-clamp-1">
                              {project.task || 'No task description'}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEditModal(project)}
                              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-[#86868b]" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                          {/* Status Dropdown */}
                          <select
                            value={project.status}
                            onChange={(e) => handleStatusChange(project, e.target.value)}
                            className={`appearance-none cursor-pointer px-2.5 py-1 pr-7 rounded-lg text-[12px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${status.bg} ${status.text}`}
                            style={{ 
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2386868b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, 
                              backgroundRepeat: 'no-repeat', 
                              backgroundPosition: 'right 6px center', 
                              backgroundSize: '12px' 
                            }}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                          
                          {formatDate(project.startDate) && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#86868b]">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(project.startDate)}</span>
                              {formatDate(project.endDate) && (
                                <span>→ {formatDate(project.endDate)}</span>
                              )}
                            </div>
                          )}
                          
                          {project.hours > 0 && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#86868b]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{project.hours}h</span>
                            </div>
                          )}
                          
                          {project.notes && (
                            <button
                              onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                              className="flex items-center gap-1 text-[12px] text-[#0071e3] hover:underline"
                            >
                              {isExpanded ? 'Hide notes' : 'Show notes'}
                            </button>
                          )}
                        </div>
                        
                        {/* Expanded Notes */}
                        {isExpanded && project.notes && (
                          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
                            <p className="text-[13px] text-[#86868b]">{project.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                {showEditModal ? 'Edit Project' : 'Add New Project'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingProject(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Client */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Client *
                </label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => setForm(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="Client name"
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              
              {/* Task */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Task *
                </label>
                <textarea
                  value={form.task}
                  onChange={(e) => setForm(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="Task description"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
              
              {/* Priority, Status & Assigned To */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Assigned To
                  </label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => setForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    {GRAPHIC_TEAM.map(member => (
                      <option key={member.email} value={member.email}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
              
              {/* Hours */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.hours}
                  onChange={(e) => setForm(prev => ({ ...prev, hours: e.target.value }))}
                  placeholder="0"
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-black/5 dark:border-white/10">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingProject(null);
                  resetForm();
                }}
                className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleEditProject : handleAddProject}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {showEditModal ? 'Save Changes' : 'Add Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Project Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                Request a Project
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              {/* Designer Selection */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Request From <span className="text-[#ff3b30]">*</span>
                </label>
                <select
                  value={requestForm.toUserEmail}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, toUserEmail: e.target.value }))}
                  required
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="">Select a designer...</option>
                  {GRAPHIC_TEAM.map(member => (
                    <option key={member.email} value={member.email}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Client */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Client <span className="text-[#ff3b30]">*</span>
                </label>
                <input
                  type="text"
                  value={requestForm.client}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="e.g., Agency Cayman Island"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              
              {/* Task Description */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Project Description <span className="text-[#ff3b30]">*</span>
                </label>
                <input
                  type="text"
                  value={requestForm.task}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="e.g., Social Media Graphics Package"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              
              {/* Priority & Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Priority
                  </label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Deadline <span className="text-[#ff3b30]">*</span>
                  </label>
                  <input
                    type="date"
                    value={requestForm.deadline}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, deadline: e.target.value }))}
                    required
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details or requirements..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 h-11 rounded-xl bg-[#5856d6] text-white text-[14px] font-medium hover:bg-[#4e4bc7] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingRequest && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphicProjectTracker;
