'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase' 
import { FaHeart, FaTimes } from 'react-icons/fa'

// Define the Name type based on our male_names table schema
type Name = {
  uuid_id: string 
  name: string
  name_set: 'English' | 'Turkish' | 'International' 
  origin: string
  meaning: string
  easy_pronunciation: string
  vibe_score?: number
}

type SwiperProps = {
  user: User 
}

// Utility function to shuffle an array
const shuffleArray = <T extends any>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function Swiper({ user }: SwiperProps) {
  const [currentName, setCurrentName] = useState<Name | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('Ready to load names')
  const [namesLoaded, setNamesLoaded] = useState(false)

  // Single useEffect that runs only once on mount
  useEffect(() => {
    console.log('🚀 Swiper mounted, loading names...')
    loadNames()
  }, []) // Empty dependency array - runs only once

  const loadNames = async () => {
    if (loading || namesLoaded) return
    
    setLoading(true)
    setStatusMessage('Loading names...')
    console.log('📊 Starting to load names...')

    try {
      // Simple fetch - get all names
      const { data: nameData, error: nameError } = await supabase
        .from('male_names')
        .select('uuid_id, name, name_set, origin, meaning, easy_pronunciation, vibe_score')
        .limit(50)

      if (nameError) {
        console.error('❌ Name data error:', nameError)
        throw nameError
      }
      
      console.log('📝 Fetched names from database:', nameData?.length || 0)
      
      if (nameData && nameData.length > 0) {
        // Shuffle and pick first name
        const shuffledNames = shuffleArray(nameData as Name[])
        const firstName = shuffledNames[0]
        
        console.log('✅ Successfully loaded names, showing:', firstName?.name)
        setCurrentName(firstName)
        setStatusMessage(`Loaded ${nameData.length} names`)
        setNamesLoaded(true)
      } else {
        console.log('⚠️ No names found in database')
        setStatusMessage('No names found in the database')
      }
    } catch (e: any) {
      console.error('❌ Load Error:', e)
      setStatusMessage(`Error: ${e.message}`)
    } finally {
      setLoading(false)
      console.log('🏁 loadNames completed')
    }
  }
  
  const handleSwipe = async (action: 'LIKE' | 'DISLIKE') => {
    if (!currentName || loading) return

    const nameToSwipe = currentName
    console.log(`${action}:`, nameToSwipe.name)
    
    // Clear current name immediately
    setCurrentName(null)
    
    // Record swipe in database
    try {
      const { error } = await supabase
        .from('user_swipes')
        .insert({
          user_id: user.id,
          name_id: nameToSwipe.uuid_id, 
          swipe_action: action,
          pool_used: nameToSwipe.name_set, 
        })

      if (error) {
        console.error('Swipe error:', error)
      } else {
        setStatusMessage(`${nameToSwipe.name} ${action === 'LIKE' ? 'LIKED!' : 'DISLIKED'}`)
      }
    } catch (e) {
      console.error('Swipe error:', e)
    }

    // Load next name after a short delay
    setTimeout(() => {
      loadNextName()
    }, 500)
  }

  const loadNextName = async () => {
    if (loading) return
    
    setLoading(true)
    setStatusMessage('Loading next name...')

    try {
      // Get all names again and pick a random one
      const { data: nameData, error: nameError } = await supabase
        .from('male_names')
        .select('uuid_id, name, name_set, origin, meaning, easy_pronunciation, vibe_score')
        .limit(50)

      if (nameError) throw nameError
      
      if (nameData && nameData.length > 0) {
        const shuffledNames = shuffleArray(nameData as Name[])
        const nextName = shuffledNames[0]
        setCurrentName(nextName)
        setStatusMessage('Next name loaded')
      } else {
        setStatusMessage('No more names available')
      }
    } catch (e: any) {
      console.error('Load next error:', e)
      setStatusMessage('Error loading next name')
    } finally {
      setLoading(false)
    }
  }
  
  const handleLike = () => handleSwipe('LIKE')
  const handleDislike = () => handleSwipe('DISLIKE')

  return (
    <div className="flex flex-col h-full w-full pb-20">
      
      {/* Status Message */}
      <div className={`text-center mb-4 text-xs font-medium h-4 ${statusMessage.includes('Error') ? 'text-red-500' : 'text-gray-500'}`}>
        {statusMessage}
      </div>

      {!user?.id ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-gray-500 text-sm">Please sign in to start swiping.</p>
        </div>
      ) : loading && !currentName ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-500 text-sm">Loading names...</p>
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
            No names available
          </p>
        </div>
      )}
    </div>
  )
}