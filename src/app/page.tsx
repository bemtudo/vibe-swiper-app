'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import Swiper from '@/components/Swiper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your liked names...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        Your Favorite VIBES ({likedNames.length})
      </h2>
      
      {likedNames.length === 0 ? (
        <div className="p-6 bg-yellow-100 border-l-4 border-yellow-500 rounded-lg text-center">
          <p className="text-gray-700 text-lg">
            You haven't swiped LIKE on any names yet! 
          </p>
          <p className="text-gray-600 mt-2">
            Get swiping to build your list of favorite names.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {likedNames.map((name, index) => (
            <div key={index} className="p-6 bg-white rounded-xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{name.name}</h3>
              <p className="text-lg text-gray-600 mb-1">
                <span className="text-blue-500 mr-2">/</span>
                {name.easy_pronunciation}
                <span className="text-blue-500 ml-2">/</span>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold">Pool:</span> {name.name_set}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold">Origin:</span> {name.origin}
              </p>
              <p className="text-sm text-gray-500 italic">
                <span className="font-semibold">Meaning:</span> {name.meaning}
              </p>
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
