import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

export const SignupPage = () => {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (userName.trim().length < 4 || userName.trim().length > 30) {
      setError('Name must be between 4 and 30 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 4 || password.length > 20) {
      setError('Password must be between 4 and 20 characters')
      return
    }

    setIsSubmitting(true)

    try {
      await signup(email, password, userName.trim())
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🏎️ Racer.io</h1>
        <h2>Create Account</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="userName">Name</label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your display name"
              required
              disabled={isSubmitting}
              minLength={4}
              maxLength={30}
            />
            <small>4-30 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
            <small>4-20 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
