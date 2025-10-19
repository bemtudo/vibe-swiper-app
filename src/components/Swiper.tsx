'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase' // Using the client exported from lib/supabase
import { FaHeart, FaTimes, FaChevronDown } from 'react-icons/fa' // Ensure you have react-icons installed

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

    try {
      // --- STEP 1: Fetch IDs of ALL names already swiped by the current user ---
      const { data: swipedData, error: swipedError } = await supabase
        .from('user_swipes')
        // CRITICAL FIX: Select the UUID column for filtering
        .select('name_id') 
        .eq('user_id', user.id)

      if (swipedError) throw swipedError

      // Extract the array of name UUIDs to exclude
      const excludedIds = swipedData.map(swipe => swipe.name_id)
      
      setStatusMessage(`Found ${excludedIds.length} names already swiped. Fetching new names...`)

      // --- STEP 2: Fetch ALL names and filter client-side (simpler approach) ---
      const { data: nameData, error: nameError } = await supabase
        .from('male_names')
        .select('uuid_id, name, name_set, origin, meaning, easy_pronunciation, vibe_score')
        .limit(200) // Fetch a reasonable batch size

      if (nameError) throw nameError
      
      // Filter out already swiped names client-side
      const unswipedNames = (nameData as Name[]).filter(
        name => !excludedIds.includes(name.uuid_id)
      )
      
      // Randomize and limit the batch
      const shuffledNames = shuffleArray(unswipedNames).slice(0, BATCH_SIZE)

      if (shuffledNames.length === 0) {
        setStatusMessage(
          excludedIds.length > 0
            ? `You've swiped all available names! Check back later.`
            : `No available names found in the database.`
        )
        setCurrentName(null)
      } else {
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
      console.error('Fetch Error:', e)
      setStatusMessage(`Error fetching names: ${e.message}.`)
    } finally {
      setLoading(false)
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
    <div className="flex flex-col h-full w-full max-w-sm mx-auto p-4">
      
      {/* Status Message */}
      <div className={`text-center mb-4 text-sm font-medium h-6 ${statusMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
        {statusMessage}
      </div>

      {/* Conditional Content */}
      {(loading && !currentName) || !user.id ? (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <FaChevronDown className="animate-bounce text-4xl mb-4 text-gray-400" />
          <p className="text-lg font-semibold text-gray-500">
            {user.id ? "Loading names..." : "Please sign in to start swiping."}
          </p>
        </div>
      ) : currentName ? (
        <div className="flex-1 bg-white rounded-xl shadow-2xl p-6 flex flex-col justify-between mb-8 transform transition-transform duration-300 ease-out border-t-4 border-blue-500">
          <div className="text-center">
            <p className="text-lg font-light text-gray-500 uppercase tracking-widest">
              {currentName.origin} Name
            </p>
            <h2 className="text-6xl font-extrabold text-gray-800 my-8">
              {currentName.name}
            </h2>
            <div className="text-gray-600 space-y-2">
              <p className="text-xl font-semibold">{currentName.meaning}</p>
              <p className="text-md font-light italic">
                Pronunciation: /{currentName.easy_pronunciation}/
              </p>
               <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                currentName.name_set === 'English' ? 'bg-green-100 text-green-800' :
                currentName.name_set === 'Turkish' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {currentName.name_set} Pool
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg h-96 flex flex-col justify-center">
          <h3 className="text-2xl font-semibold text-gray-800">All Done!</h3>
          <p className="mt-2 text-grayis-600">
            You have swiped all available names!
          </p>
        </div>
      )}

      {/* Control Buttons */}
      {currentName && (
        <div className="flex justify-around space-x-4">
          <button
            onClick={handleDislike}
            disabled={loading}
            className="flex items-center justify-center p-4 w-1/2 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50"
            aria-label="Skip Name"
          >
            <FaTimes className="text-3xl mr-2" /> Skip
          </button>
          <button
            onClick={handleLike}
            disabled={loading}
            className="flex items-center justify-center p-4 w-1/2 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50"
            aria-label="Like Name"
          >
            <FaHeart className="text-3xl mr-2" /> VIBE
          </button>
        </div>
      )}
      
      <div className="mt-4 text-xs text-center text-gray-400">
          {namesQueue.length} names left in queue.
      </div>
    </div>
  )
}