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
  // 1. DATA FETCHING (with Efficient Exclusion Logic and Pool Filter)
  // ------------------------------------------------

  const fetchNames = useCallback(async (pool: Name['name_set']) => {
    setLoading(true)
    setStatusMessage(`Loading batch of ${pool} names...`)

    try {
      // 🚨 FIX: Use subquery exclusion and specific pool filtering (correct implementation from our plan)
      const subquery = supabase
        .from('user_swipes')
        .select('name_id')
        .eq('user_id', user.id)
        .filter('pool_used', 'eq', pool) // Only exclude names swiped in this pool

      const { data: nameData, error: nameError } = await supabase
        .from('male_names')
        .select('*')
        .eq('name_set', pool) // Filter by the active pool
        .not('id', 'in', subquery) // Exclude swiped names
        .limit(BATCH_SIZE * 2) // Fetch a larger pool for client-side shuffling
      
      if (nameError) throw nameError

      // Randomize and limit the batch
      const shuffledNames = (nameData as Name[]) 
        .sort(() => 0.5 - Math.random())
        .slice(0, BATCH_SIZE)

      if (shuffledNames.length === 0) {
        setStatusMessage(`You've swiped all available names in the ${pool} pool! 🎉`)
        setCurrentName(null)
      } else {
        setNamesQueue(shuffledNames.slice(1)) 
        setCurrentName(shuffledNames[0]) 
        setStatusMessage(`Loaded ${shuffledNames.length} names from the ${pool} pool.`)
      }
    } catch (e: any) {
      console.error('Fetch Error:', e)
      setStatusMessage(`Error fetching names: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  // Effect to load names when the pool changes or component mounts
  useEffect(() => {
    fetchNames(activePool)
  }, [activePool, fetchNames])

  // ------------------------------------------------
  // 2. SWIPE LOGIC (Write Operation)
  // ------------------------------------------------
  
  const handleSwipe = async (action: 'LIKE' | 'DISLIKE') => {
    if (!currentName) return

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

    if (error) {
      console.error(`Swipe Error (${action}):`, error)
      setStatusMessage(`Error recording swipe: ${error.message}`)
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
              if (!loading) {
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