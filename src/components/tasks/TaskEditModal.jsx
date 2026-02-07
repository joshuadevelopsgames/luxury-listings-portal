import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { 
  X, 
  Trash2,
  Calendar,
  Flag,
  Tag,
  Bell,
  Plus,
  ChevronRight,
  Inbox,
  ChevronDown,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Send,
  ImagePlus,
  MoreHorizontal
} from 'lucide-react';
import { DailyTask } from '../../entities/DailyTask';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

const TaskEditModal = ({ task, isOpen, onClose, onSave, onDelete, tasks = [], onNavigate }) => {
  const { currentUser } = useAuth();
  const { confirm } = useConfirm();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
    estimatedTime: '',
    project: 'Inbox',
    labels: [],
    reminders: [],
    subtasks: [],
    attachments: []
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentLink, setCommentLink] = useState('');
  const [commentAttachmentUrls, setCommentAttachmentUrls] = useState([]);
  const [commentUploading, setCommentUploading] = useState(false);
  const [taskAttachmentUploading, setTaskAttachmentUploading] = useState(false);
  const [taskDropActive, setTaskDropActive] = useState(false);
  const [commentDropActive, setCommentDropActive] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const commentFileInputRef = useRef(null);
  const taskFileInputRef = useRef(null);

  const handleTaskDrop = (e) => {
    e.preventDefault();
    setTaskDropActive(false);
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    imageFiles.forEach((file) => uploadTaskAttachment(file));
  };

  const handleCommentDrop = (e) => {
    e.preventDefault();
    setCommentDropActive(false);
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    imageFiles.forEach((file) => uploadCommentAttachment(file));
  };
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const projectDropdownRef = useRef(null);
  const datePickerRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const labelInputRef = useRef(null);
  const reminderPickerRef = useRef(null);

  // Close image preview on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setImagePreviewUrl(null);
    };
    if (imagePreviewUrl) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [imagePreviewUrl]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideProject = projectDropdownRef.current?.contains(event.target);
      const clickedInsideDate = datePickerRef.current?.contains(event.target);
      const clickedInsidePriority = priorityDropdownRef.current?.contains(event.target);
      const clickedInsideLabel = labelInputRef.current?.contains(event.target);
      const clickedInsideReminder = reminderPickerRef.current?.contains(event.target);
      
      if (!clickedInsideProject && !clickedInsideDate && !clickedInsidePriority && !clickedInsideLabel && !clickedInsideReminder) {
        setShowProjectDropdown(false);
        setShowDatePicker(false);
        setShowPriorityDropdown(false);
        setShowLabelInput(false);
        setShowReminderPicker(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (task && isOpen) {
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        priority: task.priority || 'medium',
        dueDate: task.due_date || '',
        dueTime: task.due_time || '',
        estimatedTime: task.estimated_time || '',
        project: task.project || 'Inbox',
        labels: task.labels || [],
        reminders: task.reminders || [],
        subtasks: task.subtasks || [],
        attachments: task.attachments || []
      });
      setCommentAttachmentUrls([]);
    }
  }, [task, isOpen]);

  const handleSubmit = async () => {
    await onSave({
      ...task,
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      priority: editForm.priority,
      due_date: editForm.dueDate || null,
      due_time: editForm.dueTime || null,
      estimated_time: editForm.estimatedTime || null,
      project: editForm.project || 'Inbox',
      labels: editForm.labels || [],
      reminders: editForm.reminders || [],
      subtasks: editForm.subtasks || [],
      attachments: editForm.attachments || []
    });
  };

  const uid = currentUser?.uid || (currentUser?.email || 'anon').replace(/[^a-zA-Z0-9]/g, '_');

  const uploadTaskAttachment = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image (JPG, PNG, GIF, WebP)');
      return;
    }
    setTaskAttachmentUploading(true);
    try {
      const storage = getStorage();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `task-attachments/${uid}/${task?.id || 'new'}/${Date.now()}_${file.name.slice(0, 40)}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const next = [...(editForm.attachments || []), url];
      setEditForm(prev => ({ ...prev, attachments: next }));
      if (task?.id) await DailyTask.update(task.id, { attachments: next });
      toast.success('Photo attached');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setTaskAttachmentUploading(false);
      if (taskFileInputRef.current) taskFileInputRef.current.value = '';
    }
  };

  const removeTaskAttachment = async (url) => {
    const next = (editForm.attachments || []).filter(u => u !== url);
    setEditForm(prev => ({ ...prev, attachments: next }));
    if (task?.id) await DailyTask.update(task.id, { attachments: next });
  };

  const uploadCommentAttachment = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image (JPG, PNG, GIF, WebP)');
      return;
    }
    setCommentUploading(true);
    try {
      const storage = getStorage();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `task-attachments/${uid}/${task?.id || 'draft'}/comments/${Date.now()}_${file.name.slice(0, 40)}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCommentAttachmentUrls(prev => [...prev, url]);
      toast.success('Photo attached to comment');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setCommentUploading(false);
      if (commentFileInputRef.current) commentFileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({ title: 'Delete task', message: `Delete "${task.title}"?`, confirmText: 'Delete', variant: 'danger' });
    if (confirmed) onDelete(task);
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    
    const subtask = {
      id: Date.now(),
      text: newSubtask.trim(),
      completed: false
    };
    
    const updatedSubtasks = [...(editForm.subtasks || []), subtask];
    
    setEditForm(prev => ({
      ...prev,
      subtasks: updatedSubtasks
    }));
    setNewSubtask('');
    
    // Auto-save subtask
    await DailyTask.update(task.id, { subtasks: updatedSubtasks });
  };

  const toggleSubtask = async (subtaskId) => {
    const updatedSubtasks = editForm.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    setEditForm(prev => ({
      ...prev,
      subtasks: updatedSubtasks
    }));
    
    // Auto-save subtask change
    await DailyTask.update(task.id, { subtasks: updatedSubtasks });
  };

  const handleAddLabel = async () => {
    if (!newLabel.trim()) return;
    
    const updatedLabels = [...(editForm.labels || []), newLabel.trim()];
    setEditForm(prev => ({
      ...prev,
      labels: updatedLabels
    }));
    
    await DailyTask.update(task.id, { labels: updatedLabels });
    setNewLabel('');
    setShowLabelInput(false);
  };

  const removeLabel = async (labelToRemove) => {
    const updatedLabels = (editForm.labels || []).filter(l => l !== labelToRemove);
    setEditForm(prev => ({
      ...prev,
      labels: updatedLabels
    }));
    
    await DailyTask.update(task.id, { labels: updatedLabels });
  };

  const handleDateChange = (newDate) => {
    setEditForm(prev => ({ ...prev, dueDate: newDate }));
    DailyTask.update(task.id, { due_date: newDate || null });
  };

  const handleTimeChange = (newTime) => {
    setEditForm(prev => ({ ...prev, dueTime: newTime }));
    DailyTask.update(task.id, { due_time: newTime || null });
  };

  const removeDate = () => {
    setEditForm(prev => ({ ...prev, dueDate: '', dueTime: '' }));
    DailyTask.update(task.id, { due_date: null, due_time: null });
    setShowDatePicker(false);
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setShowPriorityDropdown(false);
    setShowProjectDropdown(false);
    setShowDatePicker(false);
    setShowLabelInput(false);
    setShowReminderPicker(false);
  };

  // Open one dropdown and close others
  const openDropdown = (dropdownSetter) => {
    closeAllDropdowns();
    dropdownSetter(true);
  };

  const handleAddReminder = async (type, value) => {
    const newReminder = {
      id: Date.now(),
      type,
      ...value
    };
    
    const updatedReminders = [...(editForm.reminders || []), newReminder];
    
    setEditForm(prev => ({
      ...prev,
      reminders: updatedReminders
    }));
    
    // Auto-save reminder
    await DailyTask.update(task.id, { reminders: updatedReminders });
  };

  const handleRemoveReminder = async (reminderId) => {
    const updatedReminders = (editForm.reminders || []).filter(r => r.id !== reminderId);
    
    setEditForm(prev => ({
      ...prev,
      reminders: updatedReminders
    }));
    
    // Auto-save reminder removal
    await DailyTask.update(task.id, { reminders: updatedReminders });
  };

  const handleAddComment = async () => {
    const commentText = commentLink.trim()
      ? `${newComment.trim()} ${commentLink.trim()}`.trim()
      : newComment.trim();
    if (!commentText.trim() && commentAttachmentUrls.length === 0) return;

    const userName = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.email || 'User';

    await task.addComment(currentUser?.email, userName, commentText.trim() || '(photo)', commentAttachmentUrls);

    const updatedComments = [...(task.comments || []), {
      id: Date.now().toString(),
      user: currentUser?.email,
      userName,
      text: commentText.trim() || '(photo)',
      timestamp: new Date().toISOString(),
      attachmentUrls: commentAttachmentUrls
    }];

    setEditForm(prev => ({ ...prev, comments: updatedComments }));
    setNewComment('');
    setCommentLink('');
    setCommentAttachmentUrls([]);
  };

  const handleDeleteComment = async (commentId) => {
    await task.deleteComment(commentId);
    
    // Update local state
    const updatedComments = (task.comments || []).filter(c => c.id !== commentId);
    setEditForm(prev => ({
      ...prev,
      comments: updatedComments
    }));
  };

  // Navigate to next task
  const goToNextTask = () => {
    if (!tasks || tasks.length === 0) return;
    const currentIndex = tasks.findIndex(t => t.id === task.id);
    const nextIndex = (currentIndex + 1) % tasks.length;
    onNavigate(tasks[nextIndex]);
  };

  // Navigate to previous task
  const goToPreviousTask = () => {
    if (!tasks || tasks.length === 0) return;
    const currentIndex = tasks.findIndex(t => t.id === task.id);
    const prevIndex = currentIndex - 1 < 0 ? tasks.length - 1 : currentIndex - 1;
    onNavigate(tasks[prevIndex]);
  };

  // Duplicate task
  const duplicateTask = async () => {
    if (!currentUser?.email) {
      toast.error('You must be logged in to duplicate tasks');
      return;
    }

    const duplicatedTask = {
      title: editForm.title,
      description: editForm.description || '',
      category: editForm.category || '',
      priority: editForm.priority || 'medium',
      due_date: editForm.dueDate || null,
      due_time: editForm.dueTime || null,
      estimated_time: editForm.estimatedTime || null,
      project: editForm.project || null,
      section: editForm.section || null,
      labels: editForm.labels || [],
      subtasks: (editForm.subtasks || []).map(st => ({ ...st, completed: false })),
      recurring: null, // Don't duplicate recurring pattern
      reminders: [], // Don't duplicate reminders
      status: 'pending',
      assigned_to: currentUser.email, // CRITICAL: Must assign to current user
      createdBy: currentUser.email
    };
    
    try {
      console.log('Duplicating task with data:', duplicatedTask);
      const newTask = await DailyTask.create(duplicatedTask);
      console.log('✅ Task duplicated successfully:', newTask);
      toast.success('Task duplicated successfully!');
      setShowMoreMenu(false);
    } catch (error) {
      console.error('❌ Error duplicating task:', error);
      toast.error(`Failed to duplicate task: ${error.message}`);
    }
  };

  const priorities = [
    { value: 'urgent', label: 'Priority 1', icon: <Flag className="w-4 h-4 fill-red-600 stroke-red-600" /> },
    { value: 'high', label: 'Priority 2', icon: <Flag className="w-4 h-4 fill-orange-500 stroke-orange-500" /> },
    { value: 'medium', label: 'Priority 3', icon: <Flag className="w-4 h-4 fill-blue-500 stroke-blue-500" /> },
    { value: 'low', label: 'Priority 4', icon: <Flag className="w-4 h-4 stroke-gray-400" /> }
  ];

  const projects = ['Inbox', 'Client Work', 'Marketing', 'Operations', 'Sales', 'Personal'];

  if (!isOpen || !task) return null;

  const currentPriority = priorities.find(p => p.value === editForm.priority) || priorities[2];

  return createPortal(
    <>
    <div className="modal-overlay bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#1d1d1f] w-full max-w-6xl shadow-2xl overflow-y-auto rounded-lg max-h-[90vh] border border-black/5 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-gray-600 dark:text-[#a1a1a6]">
            <Inbox className="w-4 h-4" />
            <span className="text-sm">{editForm.project}</span>
          </div>
          <div className="flex items-center gap-1 relative">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                goToNextTask();
              }}
              title="Next task (→)"
              disabled={!tasks || tasks.length <= 1}
              className="relative group"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                Next task
              </span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousTask();
              }}
              title="Previous task (←)"
              disabled={!tasks || tasks.length <= 1}
              className="relative group"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                Previous task
              </span>
            </Button>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTask();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-sm text-left text-gray-900 dark:text-white"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Duplicate task
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`mailto:?subject=${encodeURIComponent(editForm.title)}&body=${encodeURIComponent(editForm.description)}`, '_blank');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-sm text-left text-gray-900 dark:text-white"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share via email
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const taskText = `${editForm.title}\n${editForm.description}\nPriority: ${editForm.priority}\nDue: ${editForm.dueDate || 'No date'}`;
                      navigator.clipboard.writeText(taskText);
                      toast.success('Task details copied to clipboard!');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-sm text-left text-gray-900 dark:text-white"
                  >
                    <Paperclip className="w-4 h-4" />
                    Copy task details
                  </button>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }} 
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex">
          {/* Left Panel - Main Content */}
          <div className="flex-1 px-8 py-6">
            {/* Task Title with Checkbox */}
            <div className="flex items-start gap-3 mb-6">
              <div className="pt-1" data-no-drag>
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => {
                    onSave({
                      ...task,
                      status: checked ? 'completed' : 'pending'
                    });
                  }}
                />
              </div>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                onBlur={handleSubmit}
                className="flex-1 text-lg font-semibold border-none outline-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#a1a1a6] bg-transparent"
                placeholder="Task name"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <div className="flex items-start gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  className="text-gray-400 dark:text-[#a1a1a6] mt-1 flex-shrink-0"
                >
                  <rect x="3" y="5" width="14" height="2" rx="1"/>
                  <rect x="3" y="9" width="14" height="2" rx="1"/>
                  <rect x="3" y="13" width="10" height="2" rx="1"/>
                </svg>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  onBlur={handleSubmit}
                  className="flex-1 text-sm border-none outline-none focus:ring-0 p-0 resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#a1a1a6] bg-transparent"
                  placeholder="Description"
                  rows={3}
                />
              </div>
            </div>

            {/* Task attachments */}
            <div
              className={`mb-6 rounded-xl border-2 border-dashed transition-colors ${
                taskDropActive
                  ? 'border-[#0071e3] bg-[#0071e3]/5 dark:bg-[#0071e3]/10'
                  : 'border-gray-200 dark:border-white/10'
              } ${taskAttachmentUploading ? 'pointer-events-none opacity-70' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setTaskDropActive(true); }}
              onDragLeave={() => setTaskDropActive(false)}
              onDrop={handleTaskDrop}
            >
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e7]">Attachments</span>
                  <input
                    type="file"
                    ref={taskFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTaskAttachment(f); }}
                  />
                  <button
                    type="button"
                    onClick={() => taskFileInputRef.current?.click()}
                    disabled={taskAttachmentUploading}
                    className="flex items-center gap-1.5 text-xs text-[#0071e3] dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    {taskAttachmentUploading ? (
                      <span className="animate-pulse">Uploading…</span>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4" />
                        Add photo or drag and drop
                      </>
                    )}
                  </button>
                </div>
              {(editForm.attachments || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editForm.attachments.map((url) => (
                    <div key={url} className="relative group">
                      <button
                        type="button"
                        onClick={() => setImagePreviewUrl(url)}
                        className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTaskAttachment(url); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Sub-tasks */}
            <div className="mb-6">
              {editForm.subtasks && editForm.subtasks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {editForm.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-3 group">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => toggleSubtask(subtask.id)}
                      />
                      <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-400 dark:text-[#a1a1a6]' : 'text-gray-700 dark:text-[#e5e5e7]'}`}>
                        {subtask.text}
                      </span>
                      <button
                        onClick={async () => {
                          const updatedSubtasks = editForm.subtasks.filter(st => st.id !== subtask.id);
                          setEditForm(prev => ({
                            ...prev,
                            subtasks: updatedSubtasks
                          }));
                          await DailyTask.update(task.id, { subtasks: updatedSubtasks });
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-[#a1a1a6] hover:text-red-600 dark:hover:text-red-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-400 dark:text-[#a1a1a6]" />
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add sub-task"
                  className="flex-1 text-sm border-none outline-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#a1a1a6] bg-transparent"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="mt-8">
              {/* Existing Comments */}
              {task.comments && task.comments.length > 0 && (
                <div className="space-y-4 mb-4">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {comment.userName?.[0] || comment.user?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {comment.userName || comment.user || 'User'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-[#a1a1a6]">
                            {new Date(comment.timestamp).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-[#a1a1a6] hover:text-red-600 dark:hover:text-red-400 ml-auto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-[#e5e5e7] whitespace-pre-wrap">{comment.text}</p>
                        {comment.attachmentUrls && comment.attachmentUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {comment.attachmentUrls.map((url) => (
                              <button
                                key={url}
                                type="button"
                                onClick={() => setImagePreviewUrl(url)}
                                className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              >
                                <img src={url} alt="Comment attachment" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Comment Input */}
              <div
                className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-colors ${
                  commentDropActive
                    ? 'border-[#0071e3] bg-[#0071e3]/5 dark:bg-[#0071e3]/10 border-dashed'
                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                } ${commentUploading ? 'pointer-events-none opacity-70' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setCommentDropActive(true); }}
                onDragLeave={() => setCommentDropActive(false)}
                onDrop={handleCommentDrop}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {currentUser?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                    placeholder="Comment"
                    className="w-full text-sm border-none outline-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#a1a1a6] bg-transparent"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="url"
                      value={commentLink}
                      onChange={(e) => setCommentLink(e.target.value)}
                      placeholder="Add link or media URL"
                      className="flex-1 min-w-0 text-xs border-none outline-none focus:ring-0 p-0 placeholder-gray-400 dark:placeholder-[#a1a1a6] text-blue-600 dark:text-blue-400 bg-transparent"
                    />
                    <input
                      type="file"
                      ref={commentFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCommentAttachment(f); }}
                    />
                    <button
                      type="button"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={commentUploading}
                      className="p-1.5 rounded-lg text-gray-500 dark:text-[#a1a1a6] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#0071e3] dark:hover:text-blue-400 disabled:opacity-50"
                      title="Attach photo"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleAddComment}
                      disabled={(!newComment.trim() && !commentLink.trim() && commentAttachmentUrls.length === 0) || commentUploading}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-300 dark:disabled:text-[#a1a1a6] disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {commentAttachmentUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {commentAttachmentUrls.map((url) => (
                        <div key={url} className="relative group">
                          <img src={url} alt="Attach" className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-white/10" />
                          <button
                            type="button"
                            onClick={() => setCommentAttachmentUrls(prev => prev.filter(u => u !== url))}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 border-l border-gray-200 dark:border-white/10 px-6 py-6 space-y-4 flex-shrink-0">
            {/* Project */}
            <div className="relative" ref={projectDropdownRef}>
              <div className="py-2 px-2">
                <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e7]">Project</span>
              </div>
              <button
                onClick={() => openDropdown(setShowProjectDropdown)}
                className="w-full flex items-center gap-2 text-sm text-gray-600 dark:text-[#a1a1a6] px-2 mt-1 hover:bg-gray-50 dark:hover:bg-white/10 py-1 rounded"
              >
                <Inbox className="w-4 h-4" />
                <span>{editForm.project}</span>
              </button>
              
              {showProjectDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#2c2c2e] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 py-1 z-20">
                  {projects.map((project) => (
                    <button
                      key={project}
                      onClick={() => {
                        setEditForm(prev => ({ ...prev, project }));
                        setShowProjectDropdown(false);
                        DailyTask.update(task.id, { project });
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-sm text-left text-gray-900 dark:text-white"
                    >
                      <Inbox className="w-4 h-4" />
                      <span>{project}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="relative" ref={datePickerRef}>
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e7]">Date</span>
                {!editForm.dueDate && (
                  <button 
                    onClick={() => openDropdown(setShowDatePicker)}
                    className="text-gray-400 dark:text-[#a1a1a6] hover:text-gray-600 dark:hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editForm.dueDate ? (
                <div className="flex items-center justify-between px-2 mt-1 group">
                  <button
                    onClick={() => openDropdown(setShowDatePicker)}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#a1a1a6] hover:bg-gray-50 dark:hover:bg-white/10 px-2 py-1 rounded flex-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span>{new Date(editForm.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                      {editForm.dueTime && (
                        <span className="text-xs text-gray-500 dark:text-[#a1a1a6]">
                          {new Date(`2000-01-01T${editForm.dueTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={removeDate}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-[#a1a1a6] hover:text-red-600 dark:hover:text-red-400 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#2c2c2e] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 p-3 z-20">
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  
                  {/* Time picker */}
                  {editForm.dueDate && (
                    <div className="mb-2">
                      <label className="text-xs text-gray-600 dark:text-[#a1a1a6] mb-1 block">Time (optional)</label>
                      <input
                        type="time"
                        value={editForm.dueTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1 border-t border-gray-200 dark:border-white/10 pt-2">
                    {[
                      { label: 'Today', value: new Date().toISOString().split('T')[0] },
                      { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                      { label: 'Next week', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] }
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          handleDateChange(option.value);
                          setShowDatePicker(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/10 rounded text-sm text-gray-900 dark:text-white"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="relative" ref={priorityDropdownRef}>
              <div className="py-2 px-2">
                <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e7]">Priority</span>
              </div>
              <button
                onClick={() => openDropdown(setShowPriorityDropdown)}
                className="w-full flex items-center gap-2 text-sm text-gray-900 dark:text-white px-2 mt-1 hover:bg-gray-50 dark:hover:bg-white/10 py-1 rounded"
              >
                {currentPriority.icon}
                <span className="text-gray-600 dark:text-[#a1a1a6]">{currentPriority.label.replace('Priority ', 'P')}</span>
              </button>

              {showPriorityDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 py-1 z-20">
                  {priorities.map((priority) => (
                    <button
                      key={priority.value}
                      onClick={() => {
                        setEditForm(prev => ({ ...prev, priority: priority.value }));
                        setShowPriorityDropdown(false);
                        handleSubmit();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-sm text-left text-gray-900 dark:text-white"
                    >
                      {priority.icon}
                      <span>{priority.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="relative" ref={labelInputRef}>
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e7]">Labels</span>
                <button 
                  onClick={() => openDropdown(setShowLabelInput)}
                  className="text-gray-400 dark:text-[#a1a1a6] hover:text-gray-600 dark:hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showLabelInput && (
                <div className="px-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                      placeholder="Label name..."
                      className="flex-1 text-sm px-2 py-1 border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <Button
                      onClick={handleAddLabel}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
              
              {editForm.labels && editForm.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 px-2 mt-1">
                  {editForm.labels.map((label, idx) => (
                    <span 
                      key={idx} 
                      className="group text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200 dark:hover:bg-purple-800/50"
                    >
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        className="opacity-0 group-hover:opacity-100 hover:text-purple-900 dark:hover:text-purple-200 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reminders */}
            <div className="relative" ref={reminderPickerRef}>
              <div className="flex items-center justify-between py-2 px-2">
                <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e7]">Reminders</span>
                <button 
                  onClick={() => openDropdown(setShowReminderPicker)}
                  className="text-gray-400 dark:text-[#a1a1a6] hover:text-gray-600 dark:hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {editForm.reminders && editForm.reminders.length > 0 && (
                <div className="px-2 mb-2 space-y-1">
                  {editForm.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between px-2 py-1 bg-yellow-50 dark:bg-amber-900/30 rounded text-xs"
                    >
                      <span className="text-yellow-800 dark:text-amber-200">{reminder.label}</span>
                      <button
                        onClick={() => handleRemoveReminder(reminder.id)}
                        className="text-gray-400 dark:text-[#a1a1a6] hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showReminderPicker && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 p-4 z-20">
                  <div className="mb-3">
                    <p className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Reminders</p>
                  </div>
                  
                  {/* Relative reminders (if task has due date) */}
                  {editForm.dueDate && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-[#a1a1a6] mb-2">Before due time:</p>
                      <div className="space-y-1">
                        {[
                          { label: 'At due time', minutes: 0 },
                          { label: '15 min before', minutes: 15 },
                          { label: '30 min before', minutes: 30 },
                          { label: '1 hour before', minutes: 60 },
                          { label: '1 day before', minutes: 1440 }
                        ].map((option) => (
                          <button
                            key={option.label}
                            onClick={async () => {
                              await handleAddReminder('relative', { minutes: option.minutes, label: option.label });
                              setShowReminderPicker(false);
                            }}
                            className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/10 rounded text-sm text-left text-gray-900 dark:text-white"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Absolute time reminder */}
                  <div className="mb-3 pt-3 border-t border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-500 dark:text-[#a1a1a6] mb-2">At specific time:</p>
                    <div className="space-y-2">
                      <input
                        type="date"
                        id="reminder-date-edit"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <input
                        type="time"
                        id="reminder-time-edit"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={async () => {
                          const dateInput = document.getElementById('reminder-date-edit');
                          const timeInput = document.getElementById('reminder-time-edit');
                          
                          if (!dateInput.value || !timeInput.value) {
                            toast.error('Please select both date and time');
                            return;
                          }
                          
                          const reminderDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
                          const now = new Date();
                          
                          if (reminderDateTime < now) {
                            toast.error('Reminder time must be in the future');
                            return;
                          }
                          
                          const formattedDate = reminderDateTime.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          const formattedTime = reminderDateTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          });
                          
                          await handleAddReminder('absolute', { 
                            datetime: reminderDateTime.toISOString(),
                            label: `${formattedDate} at ${formattedTime}`
                          });
                          
                          dateInput.value = '';
                          timeInput.value = '';
                          setShowReminderPicker(false);
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Add reminder
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Button at Bottom */}
            <div className="pt-8 mt-auto">
              <Button
                onClick={handleDelete}
                variant="ghost"
                className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Image preview lightbox */}
    {imagePreviewUrl && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
        onClick={() => setImagePreviewUrl(null)}
      >
        <button
          type="button"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          onClick={() => setImagePreviewUrl(null)}
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <img
          src={imagePreviewUrl}
          alt="Preview"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>,
    document.body
  );
};

export default TaskEditModal;
