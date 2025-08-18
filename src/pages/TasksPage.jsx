import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Clock, CheckCircle2 } from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import TaskCard from '../components/tasks/TaskCard';
import { useAuth } from '../contexts/AuthContext';
import { DailyTask } from '../entities/DailyTask';

const TasksPage = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data and set up real-time listener
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tasksData = await DailyTask.filter({ assigned_to: currentUser.email }, '-due_date');
        setTasks(tasksData);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listener for user's tasks
    const unsubscribe = DailyTask.onUserTasksChange(currentUser.email, (tasksData) => {
      console.log('📡 Tasks updated via real-time listener:', tasksData);
      setTasks(tasksData);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.email]);

  // Filter tasks whenever activeFilter or tasks change
  useEffect(() => {
    filterTasks();
  }, [activeFilter, tasks]);

  const filterTasks = () => {
    let filtered = [...tasks];
    
    // Debug logging for date filtering
    console.log('Filtering tasks with activeFilter:', activeFilter);
    console.log('All tasks:', tasks.map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      due_date_obj: new Date(task.due_date),
      isToday: isToday(new Date(task.due_date)),
      isTomorrow: isTomorrow(new Date(task.due_date)),
      isPast: isPast(new Date(task.due_date)),
      status: task.status
    })));
    
    // Helper function to parse dates as local dates (same as form validation)
    const parseLocalDate = (dateString) => {
      if (!dateString) return null;
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    };
    
    // Helper function to check if date is today (local date comparison)
    const isTodayLocal = (dateString) => {
      if (!dateString) return false;
      const taskDate = parseLocalDate(dateString);
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return taskDate.getTime() === todayOnly.getTime();
    };
    
    // Helper function to check if date is tomorrow (local date comparison)
    const isTomorrowLocal = (dateString) => {
      if (!dateString) return false;
      const taskDate = parseLocalDate(dateString);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      return taskDate.getTime() === tomorrowOnly.getTime();
    };
    
    // Helper function to check if date is in the past (local date comparison)
    const isPastLocal = (dateString) => {
      if (!dateString) return false;
      const taskDate = parseLocalDate(dateString);
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return taskDate < todayOnly;
    };
    
    switch (activeFilter) {
      case "today":
        filtered = tasks.filter(task => task.due_date && isTodayLocal(task.due_date));
        break;
      case "upcoming":
        filtered = tasks.filter(task => task.due_date && (isTomorrowLocal(task.due_date) || parseLocalDate(task.due_date) > new Date()));
        break;
      case "overdue":
        filtered = tasks.filter(task => task.due_date && isPastLocal(task.due_date) && !isTodayLocal(task.due_date) && task.status !== 'completed');
        break;
      case "completed":
        filtered = tasks.filter(task => task.status === 'completed');
        break;
      default:
        filtered = tasks;
    }
    
    console.log('Filtered tasks:', filtered.map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      filter: activeFilter
    })));
    
    setFilteredTasks(filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }));
  };

  const createTask = async (taskData) => {
    try {
      console.log('Creating task with data:', taskData);
      
      await DailyTask.create({
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        due_date: taskData.dueDate, // Map dueDate to due_date
        estimated_time: taskData.estimatedTime, // Map estimatedTime to estimated_time
        assigned_to: currentUser.email,
        status: 'pending'
      });
      
      // No need to reload data - real-time listener will update automatically
      setShowForm(false);
    } catch (error) {
      console.error("Error creating task:", error);
      alert('Failed to create task. Please try again.');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await DailyTask.update(taskId, { status: newStatus });
      // No need to reload data - real-time listener will update automatically
    } catch (error) {
      console.error("Error updating task status:", error);
      alert('Failed to update task status. Please try again.');
    }
  };

  const getTaskCounts = () => {
    // Helper function to parse dates as local dates (same as filtering logic)
    const parseLocalDate = (dateString) => {
      if (!dateString) return null;
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    };
    
    // Helper function to check if date is today (local date comparison)
    const isTodayLocal = (dateString) => {
      if (!dateString) return false;
      const taskDate = parseLocalDate(dateString);
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return taskDate.getTime() === todayOnly.getTime();
    };
    
    // Helper function to check if date is tomorrow (local date comparison)
    const isTomorrowLocal = (dateString) => {
      if (!dateString) return false;
      const taskDate = parseLocalDate(dateString);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      return taskDate.getTime() === tomorrowOnly.getTime();
    };
    
    // Helper function to check if date is in the past (local date comparison)
    const isPastLocal = (dateString) => {
      if (!dateString) return false;
      const taskDate = parseLocalDate(dateString);
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return taskDate < todayOnly;
    };
    
    return {
      today: tasks.filter(task => task.due_date && isTodayLocal(task.due_date)).length,
      upcoming: tasks.filter(task => task.due_date && (isTomorrowLocal(task.due_date) || parseLocalDate(task.due_date) > new Date())).length,
      overdue: tasks.filter(task => task.due_date && isPastLocal(task.due_date) && !isTodayLocal(task.due_date) && task.status !== 'completed').length,
      completed: tasks.filter(task => task.status === 'completed').length
    };
  };

  const counts = getTaskCounts();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Daily Tasks</h1>
          <p className="text-slate-600">Stay on top of your onboarding activities</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Today ({counts.today})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({counts.upcoming})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({counts.overdue})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Completed ({counts.completed})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {showForm && (
        <TaskForm
          onSubmit={createTask}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeFilter === "completed" ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <Clock className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <p className="text-slate-500 font-medium">
              {activeFilter === "today" && "No tasks scheduled for today"}
              {activeFilter === "upcoming" && "No upcoming tasks"}
              {activeFilter === "overdue" && "No overdue tasks"}
              {activeFilter === "completed" && "No completed tasks yet"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={updateTaskStatus}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPage;

