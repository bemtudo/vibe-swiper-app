'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FaUserFriends } from 'react-icons/fa'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        })

        if (authError) throw authError

        if (authData.user && partnerEmail) {
          const { data: partnerData } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('email', partnerEmail)
            .maybeSingle()

          if (partnerData) {
            await supabase.from('user_profiles').insert({
              user_id: authData.user.id,
              email: authData.user.email,
              partner_id: partnerData.user_id
            })

            await supabase
              .from('user_profiles')
              .update({ partner_id: authData.user.id })
              .eq('user_id', partnerData.user_id)
          } else {
            await supabase.from('user_profiles').insert({
              user_id: authData.user.id,
              email: authData.user.email,
              partner_id: null
            })
          }
        } else if (authData.user) {
          await supabase.from('user_profiles').insert({
            user_id: authData.user.id,
            email: authData.user.email,
            partner_id: null
          })
        }

        setMessage('Account created successfully!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-pink-500 to-red-500 text-white rounded-full p-4 mb-4">
            <FaUserFriends className="text-4xl" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Vibe Swiper</h1>
          <p className="text-gray-600">Find the perfect baby name together</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="partnerEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                  Partner's Email <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUserFriends className="text-gray-400" />
                  </div>
                  <input
                    id="partnerEmail"
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    placeholder="partner@example.com"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Connect with your partner to see mutual favorites
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage('')
                setPartnerEmail('')
              }}
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm transition"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${
              message.includes('error') || message.includes('Error')
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-green-50 text-green-700 border border-green-100'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
