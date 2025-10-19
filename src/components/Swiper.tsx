'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase' // Using the client exported from lib/supabase

// Define the Name type based on our male_names table schema
type Name = {
  id: string
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

// Define the pools available for selection
const POOLS: Name['name_set'][] = ['International', 'English', 'Turkish']
const BATCH_SIZE = 20 // Number of names to fetch at once

export default function Swiper({ user }: SwiperProps) {
  // Swiper now manages its own active pool state
  const [activePool, setActivePool] = useState<Name['name_set']>('International')
  const [namesQueue, setNamesQueue] = useState<Name[]>([])
  const [currentName, setCurrentName] = useState<Name | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')

  // ------------------------------------------------
  // 1. DATA FETCHING (Fixed Two-Step Exclusion Logic)
  // ------------------------------------------------

  const fetchNames = useCallback(async (pool: Name['name_set']) => {
    setLoading(true)
    setStatusMessage(`Loading batch of ${pool} names...`)

    try {
      // --- STEP 1: Fetch IDs of names already swiped by the current user in this pool ---
      const { data: swipedData, error: swipedError } = await supabase
        .from('user_swipes')
        .select('name_id')
        .eq('user_id', user.id)
        .eq('pool_used', pool)

      if (swipedError) throw swipedError

      // Extract the array of name IDs to exclude
      const excludedIds = swipedData.map(swipe => swipe.name_id)
      
      setStatusMessage(`Found ${excludedIds.length} names already swiped. Fetching new names...`)

      // --- STEP 2: Fetch names, excluding those IDs ---
      const { data: nameData, error: nameError } = await supabase
        .from('male_names')
        .select('*')
        .eq('name_set', pool) // Filter by the active pool
        // Use .in and negate it with .not for exclusion
        // If excludedIds is empty, this filter is effectively ignored.
        .not('id', 'in', excludedIds.length > 0 ? excludedIds : ['']) // Use [''] if array is empty to prevent query issues
        .limit(BATCH_SIZE * 2) // Fetch a larger pool for client-side shuffling
      
      if (nameError) throw nameError
      
      // Randomize and limit the batch
      const shuffledNames = (nameData as Name[]) 
        .sort(() => 0.5 - Math.random())
        .slice(0, BATCH_SIZE)

      if (shuffledNames.length === 0) {
        setStatusMessage(
          excludedIds.length > 0 && excludedIds.length === swipedData.length 
            ? `You've swiped all available names in the ${pool} pool! 🎉`
            : `No available names found in the ${pool} pool.`
        )
        setCurrentName(null)
      } else {
        setNamesQueue(shuffledNames.slice(1)) 
        setCurrentName(shuffledNames[0]) 
        setStatusMessage(`Loaded ${shuffledNames.length} new names from the ${pool} pool.`)
      }
    } catch (e: any) {
      // Log the full error object for better debugging visibility
      console.error('Fetch Error:', e)
      setStatusMessage(`Error fetching names: ${e.message}. Check console for details.`)
    } finally {
      setLoading(false)
    }
  }, [user.id]) // Only re-create fetchNames if user.id changes

  // Effect to load names when the pool changes or component mounts
  useEffect(() => {
    // Only fetch if a user is available (Auth is handled in page.tsx)
    if (user.id) {
      fetchNames(activePool)
    }
  }, [activePool, fetchNames, user.id])

  // ------------------------------------------------
  // 2. SWIPE LOGIC (Write Operation)
  // ------------------------------------------------
  
  const handleSwipe = async (action: 'LIKE' | 'DISLIKE') => {
    if (!currentName || loading) return
    setLoading(true) // Prevent double-swipe while processing

    const nameToSwipe = currentName
    
    // Optimistic UI Update
    const nextName = namesQueue.shift() || null
    setCurrentName(nextName)
    setNamesQueue([...namesQueue]) 

    // Database Write Operation
    const { error } = await supabase
      .from('user_swipes')
      .insert({
        user_id: user.id,
        name_id: nameToSwipe.id,
        swipe_action: action,
        pool_used: nameToSwipe.name_set,
      })
      .select() // Ensure we get a response to confirm success

    if (error) {
      console.error(`Swipe Error (${action}):`, error)
      setStatusMessage(`Error recording swipe: ${error.message}`)
      // Note: In a real app, you would revert the optimistic UI update here
    } else {
      setStatusMessage(action === 'LIKE' ? `${nameToSwipe.name} LIKED! 🎉` : `${nameToSwipe.name} DISLIKED.`)
    }

    setLoading(false) // Allow new swipes/fetches

    // If queue is now empty and not already loading, trigger a new fetch
    if (!nextName && !loading) {
      // Small delay to ensure the DB write propagates, though RLS should handle it.
      setTimeout(() => fetchNames(activePool), 500); 
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
              if (!loading && activePool !== pool) {
                setCurrentName(null)
                setNamesQueue([])
                setActivePool(pool)
              }
            }}
            disabled={loading} 
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
      {(loading && !currentName) || !user.id ? (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">
            {user.id ? "Loading names..." : "Please sign in to start swiping."}
          </p>
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
          <p className="mt-2 text-grayis-600">
            You have swiped all available names in the **{activePool}** pool. Try switching to a different pool!
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-center text-gray-400">
          {namesQueue.length} names left in queue.
      </div>
    </div>
  )
}