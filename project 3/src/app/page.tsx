'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import Swiper from '@/components/Swiper'
import { FaHeart, FaListAlt, FaUsers, FaSignOutAlt } from 'react-icons/fa'

const ResultsView = ({ user }: { user: any }) => {
  const [likedNames, setLikedNames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLikedNames = async () => {
      try {
        const { data: swipeData, error: swipeError } = await supabase
          .from('user_swipes')
          .select('name_id')
          .eq('user_id', user.id)
          .eq('swipe_action', 'LIKE')

        if (swipeError) throw swipeError

        if (!swipeData || swipeData.length === 0) {
          setLikedNames([]);
          return;
        }

        const nameIds = swipeData.map(s => s.name_id);
        const { data: nameData, error: nameError } = await supabase
          .from('male_names')
          .select('*')
          .in('uuid_id', nameIds)

        if (nameError) throw nameError

        setLikedNames(nameData || []);

      } catch (err) {
        console.error('Error fetching liked names:', err)
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
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-500 border-t-transparent mb-4"></div>
        <p className="text-gray-500 text-sm">Loading your favorites...</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {likedNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="bg-gray-100 rounded-full p-6 mb-4">
            <FaHeart className="text-5xl text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-800 mb-2">No favorites yet</p>
          <p className="text-sm text-gray-500 text-center">Start swiping to build your list</p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {likedNames.map((name, index) => (
            <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{name.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">/{name.easy_pronunciation}/</p>
                </div>
                <FaHeart className="text-xl text-pink-500 mt-1" />
              </div>
              <p className="text-gray-700 text-sm mb-2">{name.meaning}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{name.origin}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-500">{name.name_set}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MatchesView = ({ user }: { user: any }) => {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('partner_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!profileData?.partner_id) {
          setLoading(false)
          return
        }

        const { data: myLikes } = await supabase
          .from('user_swipes')
          .select('name_id')
          .eq('user_id', user.id)
          .eq('swipe_action', 'LIKE')

        const { data: partnerLikes } = await supabase
          .from('user_swipes')
          .select('name_id')
          .eq('user_id', profileData.partner_id)
          .eq('swipe_action', 'LIKE')

        if (!myLikes || !partnerLikes) {
          setLoading(false)
          return
        }

        const myLikeIds = myLikes.map(s => s.name_id)
        const partnerLikeIds = partnerLikes.map(s => s.name_id)
        const commonIds = myLikeIds.filter(id => partnerLikeIds.includes(id))

        if (commonIds.length > 0) {
          const { data: nameData } = await supabase
            .from('male_names')
            .select('*')
            .in('uuid_id', commonIds)

          setMatches(nameData || [])
        }

      } catch (err) {
        console.error('Error fetching matches:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchMatches()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-500 border-t-transparent mb-4"></div>
        <p className="text-gray-500 text-sm">Finding your matches...</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="bg-gray-100 rounded-full p-6 mb-4">
            <FaUsers className="text-5xl text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-800 mb-2">No matches yet</p>
          <p className="text-sm text-gray-500 text-center">Connect with your partner to see mutual favorites</p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {matches.map((name, index) => (
            <div key={index} className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-5 shadow-sm border border-pink-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{name.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">/{name.easy_pronunciation}/</p>
                </div>
                <div className="flex items-center gap-1">
                  <FaHeart className="text-lg text-pink-500" />
                  <FaHeart className="text-lg text-pink-500" />
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-2">{name.meaning}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{name.origin}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-500">{name.name_set}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'swiper' | 'results' | 'matches'>('swiper')
  
  useEffect(() => {
    // Get current user and listen for auth changes
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user)
      setLoading(false)
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user)
        setLoading(false)
        if (event === 'SIGNED_OUT') setView('swiper')
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign Out Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Vibe Swiper</h1>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-gray-700 transition"
            aria-label="Sign Out"
          >
            <FaSignOutAlt className="text-lg" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-md mx-auto w-full">
        {view === 'swiper' && <Swiper user={user} />}
        {view === 'results' && <ResultsView user={user} />}
        {view === 'matches' && <MatchesView user={user} />}
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-around">
          <button
            onClick={() => setView('swiper')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
              view === 'swiper' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <FaHeart className="text-2xl mb-1" />
            <span className="text-xs font-medium">Swipe</span>
          </button>
          <button
            onClick={() => setView('results')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
              view === 'results' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <FaListAlt className="text-2xl mb-1" />
            <span className="text-xs font-medium">Favorites</span>
          </button>
          <button
            onClick={() => setView('matches')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
              view === 'matches' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <FaUsers className="text-2xl mb-1" />
            <span className="text-xs font-medium">Matches</span>
          </button>
        </div>
      </nav>
    </div>
  )
}