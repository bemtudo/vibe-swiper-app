'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import Swiper from '@/components/Swiper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qwntpqrpvxzcstmpdlvk.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmelyIsInJlZiI6InF3bnRwcXJwdnh6Y3N0bXBkbHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDEyNDEsImV4cCI6MjA3NjM3NzI0MX0.4PRf07KU6vGpZWBVylhsyafPa9WsAvynjuFeVwAj_jw'
)

// ------------------------------------------------
// Results View Component
// ------------------------------------------------
const ResultsView = ({ user }: { user: any }) => {
  const [likedNames, setLikedNames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLikedNames = async () => {
      try {
        // Efficient query to join male_names with user_swipes
        const { data, error } = await supabase
          .from('user_swipes')
          .select(`
            name_id,
            male_names!inner (name, origin, meaning, name_set, easy_pronunciation)
          `)
          .eq('user_id', user.id)
          .eq('swipe_action', 'LIKE') // Only fetch names you swiped LIKE

        if (error) {
          console.error('Error fetching liked names:', error)
        } else if (data) {
          // Flatten the data structure for clean display
          const names = data.map(d => ({ ...d.male_names, name_id: d.name_id }))
          setLikedNames(names)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (user) {
      fetchLikedNames()
    }
  }, [user])

  if (loading) {
    return (
      <div className="text-center p-8 text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        Loading your favorite VIBES...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">
        Your Favorite VIBES ({likedNames.length})
      </h2>
      
      {likedNames.length === 0 ? (
        <div className="p-8 bg-pink-50 border-l-4 border-pink-400 rounded-xl text-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-pink-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-gray-700 font-semibold">No likes yet!</p>
          <p className="text-sm text-gray-500 mt-1">Head back to the Swiper to start building your list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {likedNames.map((name, index) => (
            // Card design updated for cleaner, minimalist, match-list aesthetic
            <div key={index} className="p-4 bg-white rounded-xl shadow-lg border-2 border-green-200 transition hover:shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-2xl font-extrabold text-gray-900">{name.name}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">
                / {name.easy_pronunciation} /
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Origin:</span> {name.origin}</p>
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Pool:</span> {name.name_set}</p>
                <p className="text-xs text-gray-500 italic">Meaning: {name.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------
// Sign Out Button Component
// ------------------------------------------------
const SignOutButton = () => {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign Out Error:', error)
    }
  }
  
  return (
    <button 
      onClick={handleSignOut}
      className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition text-sm"
    >
      Sign Out
    </button>
  )
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'swiper' | 'results'>('swiper')

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user)
      setLoading(false)
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-md mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Vibe Swiper</h1>
              <p className="mt-2 text-gray-600">Find the perfect baby name</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto px-4 py-8">
          <AuthForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Vibe Swiper</h1>
              <p className="mt-2 text-gray-600">Find the perfect baby name</p>
              <p className="mt-1 text-sm text-gray-500">Welcome, {user.email}</p>
            </div>
            <div className="flex space-x-4 items-center">
              <button
                onClick={() => setView('swiper')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  view === 'swiper' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Swiper
              </button>
              <button
                onClick={() => setView('results')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  view === 'results' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                My Likes
              </button>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8">
        {view === 'swiper' && (
          <div className="max-w-md mx-auto">
            <Swiper user={user} />
          </div>
        )}
        {view === 'results' && <ResultsView user={user} />}
      </div>
    </div>
  )
}
