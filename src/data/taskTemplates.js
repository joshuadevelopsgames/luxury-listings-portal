/**
 * Task Templates
 * Pre-defined task templates for common workflows
 */

export const TASK_TEMPLATES = {
  CLIENT_ONBOARDING: {
    id: 'client-onboarding',
    name: 'Client Onboarding',
    description: 'Complete client onboarding process',
    icon: '👋',
    tasks: [
      {
        title: 'Send welcome email',
        description: 'Send personalized welcome email to new client with onboarding materials',
        priority: 'high',
        estimated_time: 30,
        category: 'Communication'
      },
      {
        title: 'Schedule kickoff call',
        description: 'Schedule initial kickoff call to discuss project requirements and timeline',
        priority: 'high',
        estimated_time: 15,
        category: 'Meetings'
      },
      {
        title: 'Set up project folder',
        description: 'Create project folder structure and set up necessary documents',
        priority: 'medium',
        estimated_time: 45,
        category: 'Setup'
      },
      {
        title: 'Add to CRM',
        description: 'Add client information to CRM system with all contact details',
        priority: 'medium',
        estimated_time: 20,
        category: 'Administration'
      },
      {
        title: 'Send contract for signature',
        description: 'Prepare and send service contract for client signature',
        priority: 'high',
        estimated_time: 30,
        category: 'Legal'
      }
    ]
  },
  
  WEEKLY_REVIEW: {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Weekly productivity and progress review',
    icon: '📊',
    tasks: [
      {
        title: 'Review completed tasks',
        description: 'Review all tasks completed this week and celebrate wins',
        priority: 'medium',
        estimated_time: 15,
        category: 'Review'
      },
      {
        title: 'Analyze productivity stats',
        description: 'Review productivity metrics and identify areas for improvement',
        priority: 'medium',
        estimated_time: 20,
        category: 'Review'
      },
      {
        title: 'Plan next week',
        description: 'Create task list and set priorities for next week',
        priority: 'high',
        estimated_time: 30,
        category: 'Planning'
      },
      {
        title: 'Update team on progress',
        description: 'Share weekly progress update with team members',
        priority: 'medium',
        estimated_time: 15,
        category: 'Communication'
      }
    ]
  },
  
  CONTENT_CREATION: {
    id: 'content-creation',
    name: 'Content Creation Workflow',
    description: 'End-to-end content creation process',
    icon: '✍️',
    tasks: [
      {
        title: 'Research topic',
        description: 'Research target topic and gather relevant information',
        priority: 'high',
        estimated_time: 60,
        category: 'Research'
      },
      {
        title: 'Create outline',
        description: 'Create detailed content outline with key points',
        priority: 'high',
        estimated_time: 30,
        category: 'Planning'
      },
      {
        title: 'Write first draft',
        description: 'Write complete first draft of content',
        priority: 'high',
        estimated_time: 120,
        category: 'Writing'
      },
      {
        title: 'Edit and revise',
        description: 'Edit draft for clarity, grammar, and flow',
        priority: 'medium',
        estimated_time: 45,
        category: 'Editing'
      },
      {
        title: 'Add visuals',
        description: 'Create or source images, graphics, or videos',
        priority: 'medium',
        estimated_time: 60,
        category: 'Design'
      },
      {
        title: 'Final review',
        description: 'Final review and proofreading before publishing',
        priority: 'high',
        estimated_time: 20,
        category: 'Review'
      },
      {
        title: 'Publish content',
        description: 'Publish content to target platform',
        priority: 'high',
        estimated_time: 15,
        category: 'Publishing'
      }
    ]
  },
  
  SOCIAL_MEDIA_CAMPAIGN: {
    id: 'social-media-campaign',
    name: 'Social Media Campaign',
    description: 'Launch social media marketing campaign',
    icon: '📱',
    tasks: [
      {
        title: 'Define campaign goals',
        description: 'Set clear objectives and KPIs for the campaign',
        priority: 'high',
        estimated_time: 30,
        category: 'Planning'
      },
      {
        title: 'Research target audience',
        description: 'Analyze and define target audience demographics',
        priority: 'high',
        estimated_time: 45,
        category: 'Research'
      },
      {
        title: 'Create content calendar',
        description: 'Plan content schedule with posting times',
        priority: 'high',
        estimated_time: 60,
        category: 'Planning'
      },
      {
        title: 'Design graphics',
        description: 'Create campaign graphics and visual assets',
        priority: 'medium',
        estimated_time: 120,
        category: 'Design'
      },
      {
        title: 'Write copy',
        description: 'Write engaging copy for all campaign posts',
        priority: 'high',
        estimated_time: 90,
        category: 'Writing'
      },
      {
        title: 'Schedule posts',
        description: 'Schedule all posts in social media management tool',
        priority: 'medium',
        estimated_time: 30,
        category: 'Execution'
      },
      {
        title: 'Monitor and engage',
        description: 'Monitor campaign performance and engage with audience',
        priority: 'high',
        estimated_time: 30,
        category: 'Management'
      }
    ]
  },
  
  PROPERTY_LISTING: {
    id: 'property-listing',
    name: 'Luxury Property Listing',
    description: 'Complete workflow for listing a luxury property',
    icon: '🏡',
    tasks: [
      {
        title: 'Property assessment',
        description: 'Conduct thorough property assessment and evaluation',
        priority: 'high',
        estimated_time: 120,
        category: 'Assessment'
      },
      {
        title: 'Professional photography',
        description: 'Schedule and coordinate professional property photography',
        priority: 'high',
        estimated_time: 180,
        category: 'Marketing'
      },
      {
        title: 'Create listing description',
        description: 'Write compelling property description highlighting key features',
        priority: 'high',
        estimated_time: 45,
        category: 'Writing'
      },
      {
        title: 'Set pricing strategy',
        description: 'Research market and set competitive pricing strategy',
        priority: 'high',
        estimated_time: 60,
        category: 'Strategy'
      },
      {
        title: 'Upload to MLS',
        description: 'Create and upload listing to MLS database',
        priority: 'high',
        estimated_time: 30,
        category: 'Administration'
      },
      {
        title: 'Social media marketing',
        description: 'Create and post property marketing content on social media',
        priority: 'medium',
        estimated_time: 45,
        category: 'Marketing'
      },
      {
        title: 'Prepare showing schedule',
        description: 'Set up showing schedule and coordinate with property owner',
        priority: 'medium',
        estimated_time: 20,
        category: 'Coordination'
      }
    ]
  },
  
  EMPLOYEE_ONBOARDING: {
    id: 'employee-onboarding',
    name: 'Employee Onboarding',
    description: 'Onboard new team member',
    icon: '🎯',
    tasks: [
      {
        title: 'Prepare workstation',
        description: 'Set up computer, accounts, and workspace',
        priority: 'high',
        estimated_time: 60,
        category: 'IT Setup'
      },
      {
        title: 'Send welcome package',
        description: 'Send welcome email with company info and first day details',
        priority: 'high',
        estimated_time: 20,
        category: 'Communication'
      },
      {
        title: 'Schedule orientation',
        description: 'Schedule first day orientation and team introductions',
        priority: 'high',
        estimated_time: 15,
        category: 'Meetings'
      },
      {
        title: 'Complete HR paperwork',
        description: 'Ensure all employment paperwork is completed',
        priority: 'high',
        estimated_time: 45,
        category: 'Compliance'
      },
      {
        title: 'Assign mentor',
        description: 'Assign experienced team member as mentor/buddy',
        priority: 'medium',
        estimated_time: 10,
        category: 'Training'
      },
      {
        title: 'Set up training schedule',
        description: 'Create comprehensive training schedule for first month',
        priority: 'medium',
        estimated_time: 30,
        category: 'Training'
      }
    ]
  }
};

export function getTemplateById(templateId) {
  return Object.values(TASK_TEMPLATES).find(t => t.id === templateId);
}

export function getAllTemplates() {
  return Object.values(TASK_TEMPLATES);
}

