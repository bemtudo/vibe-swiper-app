'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase as supabaseClient } from '@/lib/supabase'

// Define the Name type based on our male_names table schema
type Name = {
  id: string
  name: string
  name_set: 'English' | 'Turkish' | 'International'
  origin: string
  meaning: string
  easy_pronunciation: string
  vibe_score?: number
  // Ensure all columns are fetched
}

type SwiperProps = {
  user: User // Passed from app/page.tsx
}

const POOLS: Name['name_set'][] = ['International', 'English', 'Turkish']
const BATCH_SIZE = 20 // Number of names to fetch at once

export function Swiper({ user }: SwiperProps) {
  const [namesQueue, setNamesQueue] = useState<Name[]>([])
  const [currentName, setCurrentName] = useState<Name | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')

  // ------------------------------------------------
  // 1. DATA FETCHING (with Exclusion Logic)
  // ------------------------------------------------

  const fetchNames = useCallback(async () => {
    setLoading(true)
    setStatusMessage(`Loading random names from all pools...`)

    try {
      // Get all names from all pools
      const { data: nameData, error: nameError } = await supabaseClient
        .from('male_names')
        .select('*')
      
      if (nameError) throw nameError

      // Then, get the user's swiped names
      const { data: swipedData, error: swipeError } = await supabaseClient
        .from('user_swipes')
        .select('name_id')
        .eq('user_id', user.id)
      
      if (swipeError) throw swipeError

      // Filter out already swiped names
      const swipedIds = new Set(swipedData?.map(s => s.name_id) || [])
      const availableNames = nameData?.filter(name => !swipedIds.has(name.id)) || []

      // Randomize and limit the batch
      const shuffledNames = availableNames
        .sort(() => 0.5 - Math.random())
        .slice(0, BATCH_SIZE)

      if (shuffledNames.length === 0) {
        setStatusMessage(`You've swiped all available names! 🎉`)
        setCurrentName(null)
      } else {
        setNamesQueue(shuffledNames.slice(1)) // Put the rest in the queue
        setCurrentName(shuffledNames[0]) // Show the first one immediately
        setStatusMessage(`Loaded ${shuffledNames.length} random names from all pools.`)
      }
    } catch (e: any) {
      console.error('Fetch Error:', e)
      setStatusMessage(`Error fetching names: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  // Effect to load names when the component mounts
  useEffect(() => {
    fetchNames()
  }, [fetchNames])

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
        pool_used: nameToSwipe.name_set, // Use the name's actual pool
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
      fetchNames()
    }
  }
  
  const handleLike = () => handleSwipe('LIKE')
  const handleDislike = () => handleSwipe('DISLIKE')

  // ------------------------------------------------
  // 3. UI RENDERING
  // ------------------------------------------------

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
      

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
            {/* Pool Label */}
            <div className="mt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                currentName.name_set === 'English' ? 'bg-green-100 text-green-800' :
                currentName.name_set === 'Turkish' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {currentName.name_set}
              </span>
            </div>
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
            You have swiped all available names from all pools! 🎉
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
