// Supabase Service
// Provides database access and real-time subscriptions

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

// Only create Supabase client if credentials are available
// Otherwise, create a mock client that won't break the app
let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
  }
} else {
  console.warn('⚠️ Supabase credentials not found. Content Calendar will use localStorage fallback.');
  // Create a mock client that returns empty results but doesn't break
  supabaseClient = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({})
    }),
    removeChannel: () => {}
  };
}

export const supabase = supabaseClient;

// Test connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('_test').select('count').limit(1)
    if (error && error.code !== 'PGRST116') { // Table doesn't exist is okay
      throw error
    }
    return { connected: true, error: null }
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error)
    return { connected: false, error: error.message }
  }
}

// Content Calendar Service
export const contentCalendarService = {
  // Get all content items for a user
  async getContentItems(userEmail) {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('user_email', userEmail)
        .order('scheduled_date', { ascending: true })
      
      if (error) throw error
      
      // Convert date strings back to Date objects
      return data.map(item => ({
        ...item,
        scheduledDate: item.scheduled_date ? new Date(item.scheduled_date) : new Date(),
        createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        updatedAt: item.updated_at ? new Date(item.updated_at) : new Date()
      }))
    } catch (error) {
      console.error('❌ Error fetching content items:', error)
      throw error
    }
  },

  // Get a single content item
  async getContentItem(id) {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      return {
        ...data,
        scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : new Date(),
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
      }
    } catch (error) {
      console.error('❌ Error fetching content item:', error)
      throw error
    }
  },

  // Save/create content item
  async saveContentItem(item) {
    try {
      const itemData = {
        user_email: item.userEmail || item.user_email,
        title: item.title,
        description: item.description || null,
        platform: item.platform,
        content_type: item.contentType || item.content_type,
        scheduled_date: item.scheduledDate ? item.scheduledDate.toISOString() : new Date().toISOString(),
        status: item.status || 'draft',
        tags: Array.isArray(item.tags) ? item.tags : (item.tags ? item.tags.split(',').map(t => t.trim()) : []),
        image_url: item.imageUrl || item.image_url || null,
        video_url: item.videoUrl || item.video_url || null,
        calendar_id: item.calendarId || item.calendar_id || null,
        updated_at: new Date().toISOString()
      }

      let result
      if (item.id) {
        // Update existing
        const { data, error } = await supabase
          .from('content_items')
          .update(itemData)
          .eq('id', item.id)
          .select()
          .single()
        
        if (error) throw error
        result = data
      } else {
        // Create new
        const { data, error } = await supabase
          .from('content_items')
          .insert([itemData])
          .select()
          .single()
        
        if (error) throw error
        result = data
      }

      return {
        ...result,
        scheduledDate: result.scheduled_date ? new Date(result.scheduled_date) : new Date(),
        createdAt: result.created_at ? new Date(result.created_at) : new Date(),
        updatedAt: result.updated_at ? new Date(result.updated_at) : new Date()
      }
    } catch (error) {
      console.error('❌ Error saving content item:', error)
      throw error
    }
  },

  // Delete content item
  async deleteContentItem(id) {
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('❌ Error deleting content item:', error)
      throw error
    }
  },

  // Subscribe to real-time changes
  subscribeToContentItems(userEmail, callback) {
    const channel = supabase
      .channel(`content_items:${userEmail}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_items',
        filter: `user_email=eq.${userEmail}`
      }, (payload) => {
        console.log('📡 Content items changed:', payload.eventType, payload.new || payload.old)
        callback(payload)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  // Get all calendars for a user
  async getCalendars(userEmail) {
    try {
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ Error fetching calendars:', error)
      throw error
    }
  },

  // Create calendar
  async createCalendar(calendar) {
    try {
      const calendarData = {
        user_email: calendar.userEmail || calendar.user_email,
        name: calendar.name,
        description: calendar.description || null,
        color: calendar.color || null
      }

      const { data, error } = await supabase
        .from('calendars')
        .insert([calendarData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ Error creating calendar:', error)
      throw error
    }
  },

  // Update calendar
  async updateCalendar(id, updates) {
    try {
      const { data, error } = await supabase
        .from('calendars')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ Error updating calendar:', error)
      throw error
    }
  },

  // Delete calendar
  async deleteCalendar(id) {
    try {
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('❌ Error deleting calendar:', error)
      throw error
    }
  },

  // Subscribe to calendar changes
  subscribeToCalendars(userEmail, callback) {
    const channel = supabase
      .channel(`calendars:${userEmail}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendars',
        filter: `user_email=eq.${userEmail}`
      }, (payload) => {
        console.log('📡 Calendars changed:', payload.eventType, payload.new || payload.old)
        callback(payload)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  // Migrate from localStorage
  async migrateFromLocalStorage(userEmail) {
    try {
      console.log('🔄 Migrating content calendar from localStorage to Supabase...')
      
      // Load from localStorage
      const contentItemsKey = `content_items_${userEmail}`
      const calendarsKey = `calendars_${userEmail}`
      
      const storedItems = localStorage.getItem(contentItemsKey)
      const storedCalendars = localStorage.getItem(calendarsKey)
      
      if (!storedItems && !storedCalendars) {
        console.log('ℹ️ No localStorage data to migrate')
        return { itemsMigrated: 0, calendarsMigrated: 0 }
      }

      let itemsMigrated = 0
      let calendarsMigrated = 0

      // Migrate calendars first
      if (storedCalendars) {
        try {
          const calendars = JSON.parse(storedCalendars)
          for (const calendar of calendars) {
            // Check if calendar already exists
            const existing = await supabase
              .from('calendars')
              .select('id')
              .eq('user_email', userEmail)
              .eq('name', calendar.name)
              .single()
            
            if (!existing.data) {
              await this.createCalendar({
                userEmail,
                name: calendar.name,
                description: calendar.description,
                color: calendar.color
              })
              calendarsMigrated++
            }
          }
        } catch (error) {
          console.error('❌ Error migrating calendars:', error)
        }
      }

      // Migrate content items
      if (storedItems) {
        try {
          const items = JSON.parse(storedItems)
          for (const item of items) {
            // Check if item already exists (by checking if we have items with same title and date)
            const existing = await supabase
              .from('content_items')
              .select('id')
              .eq('user_email', userEmail)
              .eq('title', item.title)
              .eq('scheduled_date', new Date(item.scheduledDate).toISOString())
              .single()
            
            if (!existing.data) {
              await this.saveContentItem({
                ...item,
                userEmail,
                scheduledDate: new Date(item.scheduledDate)
              })
              itemsMigrated++
            }
          }
        } catch (error) {
          console.error('❌ Error migrating content items:', error)
        }
      }

      console.log(`✅ Migration complete: ${itemsMigrated} items, ${calendarsMigrated} calendars`)
      
      // Optionally clear localStorage after successful migration
      // localStorage.removeItem(contentItemsKey)
      // localStorage.removeItem(calendarsKey)

      return { itemsMigrated, calendarsMigrated }
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }
}

export default supabase
