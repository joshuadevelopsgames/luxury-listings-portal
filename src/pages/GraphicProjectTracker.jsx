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
  Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Import data for one-time Excel import
import importData from '../data/graphic-projects-import.json';
import { firestoreService } from '../services/firestoreService';
import { toast } from 'react-hot-toast';
import { format, parseISO, getYear } from 'date-fns';

// Priority colors
const priorityConfig = {
  high: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'High' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' },
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Low' }
};

// Status colors
const statusConfig = {
  not_started: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Not Started', icon: Circle },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'In Progress', icon: Loader2 },
  pending: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Pending', icon: Clock },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Completed', icon: CheckCircle2 }
};

// Graphic team members (can be expanded)
const GRAPHIC_TEAM = [
  { email: 'jasmine@smmluxurylistings.com', name: 'Jasmine', defaultSort: 'newest' },
  { email: 'jone@smmluxurylistings.com', name: 'Jone', defaultSort: 'oldest' }
];

const GraphicProjectTracker = () => {
  const { currentUser, isSystemAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Year filter - current year vs history
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  
  // User filter - whose projects to show
  const [userFilter, setUserFilter] = useState('mine'); // 'mine', 'all', or specific email
  
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
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    client: '',
    task: '',
    priority: 'medium',
    status: 'not_started',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    hours: '',
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
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = a.startDate ? new Date(typeof a.startDate === 'string' ? a.startDate : a.startDate.toDate?.() || a.startDate) : new Date(0);
      const dateB = b.startDate ? new Date(typeof b.startDate === 'string' ? b.startDate : b.startDate.toDate?.() || b.startDate) : new Date(0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [projects, selectedYear, userFilter, statusFilter, searchQuery, sortOrder, currentTeamMember, currentYear]);

  // Stats
  const stats = useMemo(() => {
    const yearProjects = projects.filter(p => {
      if (!p.startDate) return selectedYear === currentYear;
      const projectYear = getYear(typeof p.startDate === 'string' ? parseISO(p.startDate) : p.startDate.toDate?.() || new Date(p.startDate));
      return projectYear === selectedYear;
    });
    
    return {
      total: yearProjects.length,
      completed: yearProjects.filter(p => p.status === 'completed').length,
      inProgress: yearProjects.filter(p => p.status === 'in_progress').length,
      pending: yearProjects.filter(p => p.status === 'pending').length,
      totalHours: yearProjects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)
    };
  }, [projects, selectedYear, currentYear]);

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
        assignedTo: currentUser?.email || '',
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
    if (!confirm(`Delete project "${project.task}" for ${project.client}?`)) return;
    
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
  const handleImportFromExcel = async () => {
    if (!confirm(`Import ${importData.length} projects from Excel? This will add new records.`)) return;
    
    setImporting(true);
    try {
      await firestoreService.bulkImportGraphicProjects(importData);
      toast.success(`Imported ${importData.length} projects!`);
      loadProjects();
    } catch (error) {
      console.error('Error importing projects:', error);
      toast.error('Failed to import projects');
    } finally {
      setImporting(false);
    }
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
      notes: project.notes || ''
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
      notes: ''
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      const d = typeof date === 'string' ? parseISO(date) : date.toDate?.() || new Date(date);
      return format(d, 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[#1d1d1f] dark:text-white tracking-tight">
              Project Tracker
            </h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Graphic Design Team
            </p>
          </div>
          {/* Admin Import Button */}
          {isSystemAdmin && projects.length === 0 && (
            <button
              onClick={handleImportFromExcel}
              disabled={importing}
              className="h-11 px-5 rounded-xl bg-[#ff9500] text-white text-[14px] font-medium shadow-lg shadow-[#ff9500]/25 hover:bg-[#ff9f0a] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Import Excel'}
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>

        {/* Year Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap ${
                selectedYear === year
                  ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/25'
                  : 'bg-white dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/15'
              }`}
            >
              {year === currentYear ? (
                <>
                  <Calendar className="w-4 h-4" />
                  {year} (Current)
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
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-[#86868b] mb-1">Total</p>
            <p className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-[#86868b] mb-1">Completed</p>
            <p className="text-[24px] font-bold text-[#34c759]">{stats.completed}</p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-[#86868b] mb-1">In Progress</p>
            <p className="text-[24px] font-bold text-[#007aff]">{stats.inProgress}</p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-[#86868b] mb-1">Pending</p>
            <p className="text-[24px] font-bold text-[#ff9500]">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-[#86868b] mb-1">Total Hours</p>
            <p className="text-[24px] font-bold text-[#af52de]">{stats.totalHours.toFixed(1)}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/10">
          <div className="flex flex-col lg:flex-row gap-4">
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
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#86868b] whitespace-nowrap">View:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setUserFilter('mine')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    userFilter === 'mine'
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  My Projects
                </button>
                {otherTeamMembers.map(member => (
                  <button
                    key={member.email}
                    onClick={() => setUserFilter(member.email)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                      userFilter === member.email
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    {member.name}'s
                  </button>
                ))}
                <button
                  onClick={() => setUserFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    userFilter === 'all'
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  All
                </button>
              </div>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-black/5 dark:bg-white/10 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-all"
            >
              {sortOrder === 'newest' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#0071e3]" />
              <p className="text-[14px] text-[#86868b]">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-[#86868b] opacity-50" />
              <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white mb-1">No projects found</p>
              <p className="text-[13px] text-[#86868b]">
                {searchQuery ? 'Try adjusting your search' : 'Add a new project to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/10">
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Task</th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Priority</th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Start</th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">End</th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Hours</th>
                    <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const status = statusConfig[project.status] || statusConfig.not_started;
                    const priority = priorityConfig[project.priority] || priorityConfig.medium;
                    const StatusIcon = status.icon;
                    
                    return (
                      <tr 
                        key={project.id}
                        className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{project.client || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[14px] text-[#1d1d1f] dark:text-white max-w-[300px] truncate">{project.task || '-'}</p>
                          {project.notes && (
                            <p className="text-[12px] text-[#86868b] mt-0.5 max-w-[300px] truncate">{project.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-medium ${priority.bg} ${priority.text}`}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={project.status}
                            onChange={(e) => handleStatusChange(project, e.target.value)}
                            className={`appearance-none cursor-pointer px-3 py-1.5 pr-8 rounded-lg text-[12px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${status.bg} ${status.text}`}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2386868b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] text-[#86868b]">{formatDate(project.startDate)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] text-[#86868b]">{formatDate(project.endDate)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] text-[#1d1d1f] dark:text-white font-medium">{project.hours || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
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
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              
              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
};

export default GraphicProjectTracker;
