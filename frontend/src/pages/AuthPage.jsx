import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Lock, Mail, User, LogIn as LogInIcon } from 'lucide-react';

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    const user = { email, name: name || email.split('@')[0] };
    localStorage.setItem('fs_user', JSON.stringify(user));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-md mx-auto px-4 pt-32 pb-12">
        <div className="bg-[#101018] border border-white/5 rounded-2xl p-8">
          <h1 className="text-2xl font-black mb-1 text-center">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-zinc-400 text-sm text-center mb-6">
            {mode === 'login'
              ? 'Sign in to continue streaming'
              : 'Join OllieStreamy — it only takes a minute'}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Field icon={User} placeholder="Your name" value={name} onChange={setName} />
            )}
            <Field
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
            />
            <Field
              icon={Lock}
              type="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
            />
            {error && <div className="text-sm text-red-400">{error}</div>}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[#7c83ff] hover:bg-[#9097ff] text-white font-semibold flex items-center justify-center gap-2"
            >
              <LogInIcon className="w-4 h-4" />
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>
          <div className="text-center text-sm text-zinc-400 mt-6">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <Link to="/signup" className="text-[#a8aeff] hover:underline">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link to="/login" className="text-[#a8aeff] hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ icon: Icon, type = 'text', placeholder, value, onChange }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60"
      />
    </div>
  );
}
