'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import Swiper from '@/components/Swiper' 
import { FaHeart, FaListAlt, FaUsers, FaSignOutAlt, FaFire, FaBookmark, FaChevronDown, FaTrash } from 'react-icons/fa'
import { User } from '@supabase/supabase-js'

// Type definition for a liked name result
type LikedName = {
  uuid_id: string 
  name: string
  name_set: string
  origin: string
  meaning: string
  easy_pronunciation: string
}

// ------------------------------------------------
// Matches View Component - REVISED
// ------------------------------------------------
const MatchesView = ({ user }: { user: User }) => {
  const [matches, setMatches] = useState<LikedName[]>([])
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Define fetchMatches so it can be called from handleRemoveLike
  const fetchMatches = async () => {
    setLoading(true)
    
    // 1. Fetch current user's profile to get partner_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single()

    const linkedPartnerId = profile?.partner_id
    setPartnerId(linkedPartnerId)

    if (!linkedPartnerId) {
      setLoading(false)
      return
    }
    
    // 2. Fetch all name UUIDs liked by the CURRENT user
    const { data: mySwipes } = await supabase
      .from('user_swipes')
      .select('name_id')
      .eq('user_id', user.id)
      .eq('swipe_action', 'LIKE')

    const myLikedNameIds = mySwipes?.map(s => s.name_id) || []
    
    if (myLikedNameIds.length === 0) {
        setMatches([]) // Explicitly clear matches if I have no likes
        setLoading(false)
        return
    }

    // 3. Find names that the PARTNER ALSO LIKED among my liked names
    const { data: partnerMatches } = await supabase
        .from('user_swipes')
        .select('name_id')
        .eq('user_id', linkedPartnerId)
        .eq('swipe_action', 'LIKE')
        .in('name_id', myLikedNameIds)

    const matchedNameIds = partnerMatches?.map(m => m.name_id) || []

    // 4. Fetch full name details for the matched IDs
    if (matchedNameIds.length > 0) {
        const { data: matchedNamesData } = await supabase
            .from('male_names')
            .select('uuid_id, name, name_set, origin, meaning, easy_pronunciation')
            .in('uuid_id', matchedNameIds)
            
        setMatches(matchedNamesData as LikedName[] || [])
    } else {
        setMatches([])
    }

    setLoading(false)
  }

  // NEW: Function to remove a name (swipe) from the database
  const handleRemoveLike = async (nameId: string) => {
    if (!user) return;
    
    // Optimistic UI Update: Remove from the displayed matches list
    setMatches(prevNames => prevNames.filter(name => name.uuid_id !== nameId));

    // Delete the 'LIKE' swipe record from user_swipes
    const { error } = await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id)
        .eq('name_id', nameId)
        .eq('swipe_action', 'LIKE');

    if (error) {
        console.error("Error removing match like:", error);
        // If delete fails, re-fetch the list to restore the name
        fetchMatches(); 
        alert("Failed to remove name. Please try again.");
    }
    // Note: No need to re-run fetchMatches on success since optimistic update handled it
  }


  useEffect(() => {
    fetchMatches()
  }, [user.id])
  
  if (loading) {
    return (
      <div className="text-center p-8 text-gray-500">
        <FaChevronDown className="animate-bounce text-4xl mb-4 mx-auto" />
        Finding your VIBE matches...
      </div>
    )
  }

  if (!partnerId) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white border-4 border-dashed border-gray-200 rounded-2xl text-center shadow-md mt-10">
        <FaUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800">No Partner Linked</h3>
        <p className="mt-2 text-gray-600 text-sm">
          Link accounts with your partner's email (in settings/sign in) to unlock mutual matching!
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-0">
      <div className="grid grid-cols-1 gap-3">
        {matches.length === 0 ? (
          <div className="p-8 bg-white border-l-4 border-gray-400 rounded-2xl text-center shadow-lg mt-10">
            <FaHeart className="h-10 w-10 text-pink-500 mx-auto mb-3" />
            <p className="text-gray-700 font-bold">No common VIBES yet!</p>
            <p className="text-sm text-gray-500 mt-1">Keep swiping, you're close to a match!</p>
          </div>
        ) : (
          matches.map((name) => (
            <div key={name.uuid_id} className="p-4 bg-white rounded-xl shadow-lg border-l-4 border-green-500 transition hover:shadow-xl flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-extrabold text-green-700">{name.name}</h3>
                <p className="text-sm font-medium text-gray-600">
                  / {name.easy_pronunciation} /
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">Meaning: {name.meaning}</p>
              </div>
              
              {/* NEW: Remove Button */}
              <button 
                onClick={() => handleRemoveLike(name.uuid_id)}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                aria-label={`Remove ${name.name} from matches`}
              >
                <FaTrash className="h-5 w-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------
// Results View Component (My Likes)
// ------------------------------------------------
const ResultsView = ({ user }: { user: User }) => {
  const [likedNames, setLikedNames] = useState<LikedName[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLikedNames = async () => {
    setLoading(true)
    try {
      // Step 1: Get liked name IDs from user_swipes
      const { data: swipeData } = await supabase
        .from('user_swipes')
        .select('name_id')
        .eq('user_id', user.id) 
        .eq('swipe_action', 'LIKE')

      if (!swipeData || swipeData.length === 0) {
        setLikedNames([]);
        return;
      }

      // Step 2: Get name details from male_names using the UUID IDs
      const nameIds = swipeData.map(s => s.name_id);
      const { data: nameData } = await supabase
        .from('male_names')
        .select('uuid_id, name, name_set, origin, meaning, easy_pronunciation')
        .in('uuid_id', nameIds) as { data: LikedName[] | null, error: any }

      setLikedNames(nameData || []);

    } catch (err) {
      console.error('Error fetching liked names:', err)
    } finally {
      setLoading(false)
    }
  }

  // Function to remove a name (swipe) from the database
  const handleRemoveLike = async (nameId: string) => {
    if (!user) return;
    
    // Optimistic UI Update
    setLikedNames(prevNames => prevNames.filter(name => name.uuid_id !== nameId));

    // Delete the 'LIKE' swipe record from user_swipes
    const { error } = await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id)
        .eq('name_id', nameId)
        .eq('swipe_action', 'LIKE');

    if (error) {
        console.error("Error removing like:", error);
        // If delete fails, re-fetch the list to restore the name
        fetchLikedNames(); 
        alert("Failed to remove name. Please try again.");
    }
  }

  useEffect(() => {
    if (user) {
      fetchLikedNames()
    }
  }, [user.id])

  if (loading) {
    return (
      <div className="text-center p-8 text-gray-500">
        <FaChevronDown className="animate-bounce text-4xl mb-4 mx-auto" />
        Loading your favorite VIBES...
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-0">
      <div className="grid grid-cols-1 gap-3">
        {likedNames.length === 0 ? (
          <div className="p-8 bg-white border-4 border-dashed border-gray-200 rounded-2xl text-center shadow-md mt-10">
            <FaBookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 font-bold">No saved VIBES yet!</p>
            <p className="text-sm text-gray-500 mt-1">Head back to the Swiper to start building your list.</p>
          </div>
        ) : (
          likedNames.map((name) => (
            <div key={name.uuid_id} className="p-4 bg-white rounded-xl shadow-lg border-l-4 border-pink-500 transition hover:shadow-xl flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900">{name.name}</h3>
                <p className="text-sm font-medium text-gray-600">
                  / {name.easy_pronunciation} /
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">Meaning: {name.meaning}</p>
              </div>
              
              {/* Remove Button */}
              <button 
                onClick={() => handleRemoveLike(name.uuid_id)}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                aria-label={`Remove ${name.name} from likes`}
              >
                <FaTrash className="h-5 w-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------
// Fixed Bottom Navigation Component
// ------------------------------------------------
const BottomNavigation = ({ view, setView, user }: { view: string, setView: (v: 'swiper' | 'results' | 'matches') => void, user: User }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    { id: 'swiper', icon: FaFire, label: 'VIBE', color: 'text-gray-500' },
    { id: 'results', icon: FaBookmark, label: 'My Likes', color: 'text-gray-500' },
    { id: 'matches', icon: FaUsers, label: 'Matches', color: 'text-gray-500' },
  ]
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav max-w-md mx-auto">
      <div className="flex justify-around py-3">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = view === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as 'swiper' | 'results' | 'matches')}
              className={`flex flex-col items-center text-xs font-medium transition duration-200 
                ${isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}
              `}
            >
              <Icon className="h-6 w-6 mb-1" />
              {item.label}
            </button>
          )
        })}

        {/* Sign Out Button (integrated into bottom bar for mobile space) */}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center text-xs font-medium transition duration-200 text-red-400 hover:text-red-600"
        >
          <FaSignOutAlt className="h-6 w-6 mb-1" />
          Sign Out
        </button>
      </div>
    </nav>
  )
}


export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'swiper' | 'results' | 'matches'>('swiper')
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        if (event === 'SIGNED_OUT') setView('swiper') 
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Vibe Swiper...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto">
        <div className="p-6 text-center pt-20">
          <h1 className="text-4xl font-extrabold text-gray-800">Vibe Swiper</h1>
          <p className="mt-2 text-gray-500">Find the perfect baby name, together.</p>
        </div>
        <div className="px-4 py-8">
          {/* AuthForm now includes the partner linking field */}
          <AuthForm />
        </div>
      </div>
    )
  }

  // Logged-in user view: Header + Content + Fixed Bottom Nav
  return (
    <div className="min-h-screen bg-gray-100 pb-20 max-w-md mx-auto">
      {/* Fixed Top Header (Clean) */}
      <div className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 text-center">Vibe Swiper</h1>
          <p className="mt-1 text-xs text-gray-500 text-center">User: {user.email}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-2 py-4">
        {view === 'swiper' && <Swiper user={user} />}
        {view === 'results' && <ResultsView user={user} />}
        {view === 'matches' && <MatchesView user={user} />} 
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation view={view} setView={setView} user={user} />
    </div>
  )
}