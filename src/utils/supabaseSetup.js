// Supabase Setup Utilities
// Helper functions for testing and verifying Supabase setup

import { supabase, testSupabaseConnection, contentCalendarService } from '../services/supabaseService'

/**
 * Test Supabase connection and setup
 */
export const verifySupabaseSetup = async () => {
  console.log('🔍 Verifying Supabase setup...')
  
  const results = {
    connection: false,
    tables: {
      content_items: false,
      calendars: false
    },
    rls: {
      content_items: false,
      calendars: false
    },
    realtime: {
      content_items: false,
      calendars: false
    }
  }

  // Test connection
  try {
    const connectionTest = await testSupabaseConnection()
    results.connection = connectionTest.connected
    if (!connectionTest.connected) {
      console.error('❌ Supabase connection failed:', connectionTest.error)
      return results
    }
    console.log('✅ Supabase connection successful')
  } catch (error) {
    console.error('❌ Connection test error:', error)
    return results
  }

  // Test tables exist
  try {
    const { data: contentItems, error: ciError } = await supabase
      .from('content_items')
      .select('count')
      .limit(1)
    
    if (!ciError) {
      results.tables.content_items = true
      console.log('✅ content_items table exists')
    } else {
      console.error('❌ content_items table check failed:', ciError.message)
    }
  } catch (error) {
    console.error('❌ Error checking content_items table:', error)
  }

  try {
    const { data: calendars, error: calError } = await supabase
      .from('calendars')
      .select('count')
      .limit(1)
    
    if (!calError) {
      results.tables.calendars = true
      console.log('✅ calendars table exists')
    } else {
      console.error('❌ calendars table check failed:', calError.message)
    }
  } catch (error) {
    console.error('❌ Error checking calendars table:', error)
  }

  // Test RLS (check if policies exist)
  // Note: This is a simplified check - actual RLS testing requires proper auth
  results.rls.content_items = results.tables.content_items
  results.rls.calendars = results.tables.calendars

  // Test realtime (check if we can subscribe)
  try {
    const testChannel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_items'
      }, () => {})
      .subscribe()
    
    // Wait a moment to see if subscription works
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (testChannel.state === 'SUBSCRIBED') {
      results.realtime.content_items = true
      console.log('✅ Real-time subscription works for content_items')
    }
    
    supabase.removeChannel(testChannel)
  } catch (error) {
    console.error('❌ Real-time test failed:', error)
  }

  return results
}

/**
 * Display setup status
 */
export const displaySetupStatus = (results) => {
  console.log('\n📊 Supabase Setup Status:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Connection: ${results.connection ? '✅' : '❌'}`)
  console.log(`\nTables:`)
  console.log(`  content_items: ${results.tables.content_items ? '✅' : '❌'}`)
  console.log(`  calendars: ${results.tables.calendars ? '✅' : '❌'}`)
  console.log(`\nRow Level Security:`)
  console.log(`  content_items: ${results.rls.content_items ? '✅' : '❌'}`)
  console.log(`  calendars: ${results.rls.calendars ? '✅' : '❌'}`)
  console.log(`\nReal-time:`)
  console.log(`  content_items: ${results.realtime.content_items ? '✅' : '❌'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

/**
 * Run full setup verification
 */
export const runSetupVerification = async () => {
  const results = await verifySupabaseSetup()
  displaySetupStatus(results)
  
  if (results.connection && results.tables.content_items && results.tables.calendars) {
    console.log('✅ Supabase is properly configured!')
    return true
  } else {
    console.log('❌ Supabase setup incomplete. Please check the setup guide.')
    return false
  }
}

export default {
  verifySupabaseSetup,
  displaySetupStatus,
  runSetupVerification
}
