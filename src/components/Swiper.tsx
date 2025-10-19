'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { FaHeart, FaTimes } from 'react-icons/fa'

// Define the Name type based on our male_names table schema
type Name = {
  // CRITICAL FIX: Use 'uuid_id' to match the database schema
  uuid_id: string 
  name: string
  name_set: 'English' | 'Turkish' | 'International' 
  origin: string
  meaning: string
  easy_pronunciation: string
  vibe_score?: number
}

type SwiperProps = {
  user: User // Passed from app/page.tsx
}

const BATCH_SIZE = 20 // Number of names to fetch at once

// Utility function to shuffle an array
const shuffleArray = <T extends any>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function Swiper({ user }: SwiperProps) {
  const [namesQueue, setNamesQueue] = useState<Name[]>([])
  const [currentName, setCurrentName] = useState<Name | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  
  // NOTE: This component no longer uses external state for the user profile 
  // but relies solely on the 'user' prop from the parent, which is enough 
  // for the core swipe functionality.

  // ------------------------------------------------
  // 1. DATA FETCHING (Randomized and Exclusion Logic)
  // ------------------------------------------------

  const fetchNames = useCallback(async () => {
    // Only fetch if the queue is low
    if (loading || namesQueue.length > 5) return;
    
    setLoading(true)
    setStatusMessage(`Loading a batch of new names...`)
    console.log('🔍 Starting fetchNames...')

    try {
      console.log('📊 Step 1: Fetching user swipes for user:', user.id)
      // --- STEP 1: Fetch IDs of ALL names already swiped by the current user ---
      const { data: swipedData, error: swipedError } = await supabase
        .from('user_swipes')
        // CRITICAL FIX: Select the UUID column for filtering
        .select('name_id') 
        .eq('user_id', user.id)

      if (swipedError) {
        console.error('❌ Swiped data error:', swipedError)
        throw swipedError
      }

      // Extract the array of name UUIDs to exclude
      const excludedIds = swipedData?.map(swipe => swipe.name_id) || []
      console.log('📝 Found swiped names:', excludedIds.length)
      setStatusMessage(`Found ${excludedIds.length} names already swiped. Fetching new names...`)

      console.log('📊 Step 2: Fetching all names from male_names table')
      // --- STEP 2: Fetch ALL names and filter client-side (simpler approach) ---
      const { data: nameData, error: nameError } = await supabase
        .from('male_names')
        .select('uuid_id, name, name_set, origin, meaning, easy_pronunciation, vibe_score')
        .limit(200) // Fetch a reasonable batch size

      if (nameError) {
        console.error('❌ Name data error:', nameError)
        throw nameError
      }
      
      console.log('📝 Fetched names from database:', nameData?.length || 0)
      
      // Filter out already swiped names client-side
      const unswipedNames = (nameData as Name[]).filter(
        name => !excludedIds.includes(name.uuid_id)
      )
      
      console.log('📝 After filtering swiped names:', unswipedNames.length)
      
      // Randomize and limit the batch
      const shuffledNames = shuffleArray(unswipedNames).slice(0, BATCH_SIZE)

      if (shuffledNames.length === 0) {
        console.log('⚠️ No names available after filtering')
        setStatusMessage(
          excludedIds.length > 0
            ? `You've swiped all available names! Check back later.`
            : `No available names found in the database.`
        )
        setCurrentName(null)
      } else {
        console.log('✅ Successfully loaded names:', shuffledNames.length)
        setNamesQueue(prevQueue => {
            // Filter out any duplicates that might already be in the queue 
            // (shouldn't happen with proper exclusion, but safer to check)
            const uniqueNewNames = shuffledNames.filter(
                newName => !prevQueue.some(queuedName => queuedName.uuid_id === newName.uuid_id)
            )
            return [...prevQueue, ...uniqueNewNames]
        })
        setStatusMessage(`Loaded ${shuffledNames.length} new random names.`)
      }
    } catch (e: any) {
      console.error('❌ Fetch Error:', e)
      console.error('❌ Full error details:', e)
      setStatusMessage(`Error fetching names: ${e.message}. Check console for details.`)
    } finally {
      setLoading(false)
      console.log('🏁 fetchNames completed')
    }
  }, [user.id, loading, namesQueue.length])

  // Effect to manage the current name and trigger the next fetch
  useEffect(() => {
    // 1. Set the first name if the queue has loaded
    if (!currentName && namesQueue.length > 0) {
      setCurrentName(namesQueue[0])
      setNamesQueue(prevQueue => prevQueue.slice(1))
    } 
    
    // 2. Trigger the next fetch if the queue is low
    if (namesQueue.length < 5 && !loading) {
        fetchNames();
    }
  }, [namesQueue, currentName, loading, fetchNames])

  // ------------------------------------------------
  // 2. SWIPE LOGIC (Write Operation)
  // ------------------------------------------------
  
  const handleSwipe = async (action: 'LIKE' | 'DISLIKE') => {
    if (!currentName || loading) return
    setLoading(true) // Prevent double-swipe while processing

    const nameToSwipe = currentName
    
    // 1. Optimistic UI Update: Move to the next name
    const nextName = namesQueue[0] || null
    setCurrentName(nextName)
    setNamesQueue(prevQueue => prevQueue.slice(1)) 

    // 2. Database Write Operation
    const { error } = await supabase
      .from('user_swipes')
      .insert({
        user_id: user.id,
        name_id: nameToSwipe.uuid_id, // CRITICAL: Use UUID directly
        swipe_action: action,
        pool_used: nameToSwipe.name_set, 
      })

    if (error) {
      console.error(`Swipe Error (${action}):`, error)
      setStatusMessage(`Error recording swipe: ${error.message}`)
    } else {
      setStatusMessage(action === 'LIKE' ? `${nameToSwipe.name} LIKED! ❤️` : `${nameToSwipe.name} DISLIKED.`)
    }

    setLoading(false) 
  }
  
  const handleLike = () => handleSwipe('LIKE')
  const handleDislike = () => handleSwipe('DISLIKE')

  // ------------------------------------------------
  // 3. UI RENDERING
  // ------------------------------------------------

  return (
    <div className="flex flex-col h-full w-full pb-20">
      {(loading && !currentName) || !user.id ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-500 text-sm">
            {user.id ? "Loading names..." : "Please sign in to start swiping."}
          </p>
        </div>
      ) : currentName ? (
        <>
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm border border-gray-100">
              <div className="text-center">
                <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal-600 bg-teal-50 mb-4">
                  {currentName.origin}
                </span>
                <h2 className="text-5xl font-black text-gray-900 mb-6 leading-tight">
                  {currentName.name}
                </h2>
                <p className="text-gray-600 text-base mb-3 leading-relaxed">
                  {currentName.meaning}
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  /{currentName.easy_pronunciation}/
                </p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  currentName.name_set === 'English' ? 'bg-blue-50 text-blue-700' :
                  currentName.name_set === 'Turkish' ? 'bg-purple-50 text-purple-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {currentName.name_set}
                </span>
              </div>
            </div>
          </div>

          <div className="fixed bottom-20 left-0 right-0 px-6 pb-4 bg-gradient-to-t from-white via-white to-transparent pt-8">
            <div className="max-w-md mx-auto flex justify-center gap-6">
              <button
                onClick={handleDislike}
                disabled={loading}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-gray-200 text-gray-600 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                aria-label="Skip Name"
              >
                <FaTimes className="text-2xl" />
              </button>
              <button
                onClick={handleLike}
                disabled={loading}
                className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                aria-label="Like Name"
              >
                <FaHeart className="text-3xl" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="bg-gray-100 rounded-full p-6 mb-4">
            <FaHeart className="text-5xl text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">All Done!</h3>
          <p className="text-sm text-gray-500 text-center">
            You've swiped all available names
          </p>
        </div>
      )}
    </div>
  )
}