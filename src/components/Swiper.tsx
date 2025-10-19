'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { User } from '@supabase/supabase-js'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Define the Name type based on our male_names table schema
type Name = {
  id: string
  name: string
  name_set: 'English' | 'Turkish' | 'International'
  origin: string
  meaning: string
  easy_pronunciation: string
  // Ensure all columns are fetched
}

type SwiperProps = {
  user: User // Passed from app/page.tsx
}

const POOLS: Name['name_set'][] = ['International', 'English', 'Turkish']
const BATCH_SIZE = 20 // Number of names to fetch at once

export function Swiper({ user }: SwiperProps) {
  const [activePool, setActivePool] = useState<Name['name_set']>('International')
  const [namesQueue, setNamesQueue] = useState<Name[]>([])
  const [currentName, setCurrentName] = useState<Name | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')

  // ------------------------------------------------
  // 1. DATA FETCHING (with Exclusion Logic)
  // ------------------------------------------------

  const fetchNames = useCallback(async (pool: Name['name_set']) => {
    setLoading(true)
    setStatusMessage(`Loading batch of ${pool} names...`)

    try {
      // Use a single, efficient query to select names NOT IN the user_swipes table
      // This is far more scalable than fetching all swiped IDs first.
      const { data: nameData, error: nameError } = await supabaseClient
        .from('male_names')
        .select('*')
        .eq('name_set', pool)
        
        // 🚨 EFFICIENT EXCLUSION LOGIC: Use a subquery to filter names 
        // that do NOT exist in the user_swipes table for the current user.
        .not('id', 'in', supabaseClient
            .from('user_swipes')
            .select('name_id')
            .eq('user_id', user.id)
        )
        // Ordering by random() is OK for small batches, but we will shuffle client-side 
        // as the Supabase client doesn't directly expose .order('random()') easily for this scenario.
        // For a true random selection in a scalable way, we would ideally use a database function.
        // We will fetch more than needed and shuffle client-side to mitigate table-scanning risk.
        .limit(BATCH_SIZE * 2) // Fetch a larger pool to select from
      
      if (nameError) throw nameError

      // Randomize the batch locally for a true "shuffle" experience
      // We limit to BATCH_SIZE after shuffling the larger fetched pool.
      const shuffledNames = nameData
        .sort(() => 0.5 - Math.random())
        .slice(0, BATCH_SIZE)

      if (shuffledNames.length === 0) {
        setStatusMessage(`You've swiped all available names in the ${pool} pool!`)
        setCurrentName(null)
      } else {
        setNamesQueue(shuffledNames.slice(1)) // Put the rest in the queue
        setCurrentName(shuffledNames[0]) // Show the first one immediately
        setStatusMessage(`Loaded ${shuffledNames.length} names from the ${pool} pool.`)
      }
    } catch (e: any) {
      console.error('Fetch Error:', e)
      setStatusMessage(`Error fetching names: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  // Effect to load names when the component mounts or the pool changes
  useEffect(() => {
    fetchNames(activePool)
  }, [activePool, fetchNames])

  // ------------------------------------------------
  // 2. SWIPE LOGIC (Write Operation)
  // ------------------------------------------------
  
  const handleSwipe = async (action: 'LIKE' | 'DISLIKE') => {
    if (!currentName) return

    const nameToSwipe = currentName
    
    // Optimistic UI Update: Move to the next name immediately
    const nextName = namesQueue.shift() || null
    setCurrentName(nextName)
    setNamesQueue([...namesQueue]) // Update queue state

    // Database Write Operation
    const { error } = await supabaseClient
      .from('user_swipes')
      .insert({
        user_id: user.id,
        name_id: nameToSwipe.id,
        swipe_action: action,
        pool_used: activePool,
      })

    if (error) {
      console.error(`Swipe Error (${action}):`, error)
      setStatusMessage(`Error recording swipe: ${error.message}`)
      // In a real app, you would revert the UI state here
    } else {
      setStatusMessage(action === 'LIKE' ? `${nameToSwipe.name} LIKED! 🎉` : `${nameToSwipe.name} DISLIKED.`)
    }

    // If queue is now empty, trigger a new fetch
    if (!nextName && !loading) {
      fetchNames(activePool)
    }
  }
  
  const handleLike = () => handleSwipe('LIKE')
  const handleDislike = () => handleSwipe('DISLIKE')

  // ------------------------------------------------
  // 3. UI RENDERING
  // ------------------------------------------------

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
      
      {/* Pool Selector */}
      <div className="flex justify-center space-x-4 mb-6">
        {POOLS.map(pool => (
          <button
            key={pool}
            onClick={() => {
              // Only allow pool switch if not currently loading
              if (!loading) {
                // Clear state on pool switch to prevent incorrect swiping
                setCurrentName(null);
                setNamesQueue([]);
                setActivePool(pool);
              }
            }}
            disabled={loading} // Disable buttons while loading
            className={`px-4 py-2 text-sm font-medium rounded-full transition duration-150 ${
              activePool === pool
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-blue-100 disabled:opacity-50'
            }`}
          >
            {pool}
          </button>
        ))}
      </div>

      {/* Status Message */}
      <div className={`text-center mb-4 text-sm font-medium ${statusMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
        {statusMessage}
      </div>

      {/* Swiping Card */}
      {loading && !currentName ? (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">Loading names...</p>
        </div>
      ) : currentName ? (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 p-8 rounded-2xl shadow-xl border-t-4 border-blue-500 transform transition-all duration-500">
          <div className="text-center mb-6">
            <h2 className="text-5xl font-extrabold text-gray-900 mb-2">{currentName.name}</h2>
            <p className="text-xl text-gray-600 font-semibold">
              <span className="text-blue-500 mr-2">/</span>
              {currentName.easy_pronunciation}
              <span className="text-blue-500 ml-2">/</span>
            </p>
          </div>
          
          <div className="space-y-2 text-center text-gray-700">
            <p className="text-sm font-light italic">
              Origin: {currentName.origin}
            </p>
            <p className="text-sm font-light italic">
              Meaning: {currentName.meaning || 'N/A'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-around mt-8 space-x-4">
            <button
              onClick={handleDislike}
              disabled={loading}
              className="flex items-center justify-center w-full p-3 text-red-600 border-2 border-red-600 rounded-full font-bold uppercase transition duration-200 hover:bg-red-50 hover:shadow-lg disabled:opacity-50"
              aria-label="Dislike Name"
            >
              Skip
            </button>
            <button
              onClick={handleLike}
              disabled={loading}
              className="flex items-center justify-center w-full p-3 bg-green-500 text-white rounded-full font-bold uppercase shadow-md transition duration-200 hover:bg-green-600 hover:shadow-lg disabled:opacity-50"
              aria-label="Like Name"
            >
              VIBE
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
          <h3 className="text-2xl font-semibold text-gray-800">All Done!</h3>
          <p className="mt-2 text-gray-600">
            You have swiped all the names in the **{activePool}** pool or we ran out of names. Try switching to a different pool!
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-center text-gray-400">
          {namesQueue.length} names left in queue.
      </div>
    </div>
  )
}

export default Swiper
