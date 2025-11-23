import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import SocialProviders from '@/components/auth/SocialProviders';
import AuthCard from '@/components/auth/AuthCard';
import AuthPageShell, {
  AUTH_PAGE_DEFAULT_BACKGROUND,
} from '@/components/auth/AuthPageShell';
import AuthBrandIntro from '@/components/auth/AuthBrandIntro';
import { Eye, EyeOff } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { signInWithGoogle } from '@/lib/google';

const SignupPage = () => {
  const { socialLogin, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setPending(true);
    try {
      const name = `${firstName} ${lastName}`.trim();
      const res = await register({ name, email, password });
      if (res?.success && res?.pending) {
        sessionStorage.setItem('verify_token', res.verifyToken || '');
        sessionStorage.setItem('pending_user', JSON.stringify(res.user || {}));
        navigate('/verify');
      } else if (res?.success) {
        navigate('/');
      } else {
        setError(res?.error || 'Signup failed. Please try again.');
      }
    } finally {
      setPending(false);
    }
  };

  const handleSocial = async (provider, payload) => {
    setError('');
    setPending(true);
    try {
      if (provider === 'google-credential' || provider === 'google') {
        const credential =
          provider === 'google-credential' ? payload : await signInWithGoogle();
        const res = await loginWithGoogle(credential);
        if (!res?.success) throw new Error('Google failed');
        if (res?.pending) {
          sessionStorage.setItem('verify_token', res.verifyToken || '');
          sessionStorage.setItem(
            'pending_user',
            JSON.stringify(res.user || {})
          );
        }
        navigate(res?.pending ? '/verify' : '/');
      } else {
        await socialLogin(provider);
      }
    } catch (e) {
      setError(e?.message || 'Google authentication failed. Please try again.');
    }
    setPending(false);
  };

  const signupCard = (
    <AuthCard
      title="Create Account"
      compact
      className="!max-w-full sm:!max-w-md lg:!max-w-lg"
      cardClassName="shadow-2xl lg:p-8"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-3 sm:space-y-4 lg:space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="relative">
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder=" "
              className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              required
              autoComplete="given-name"
            />
            <label
              htmlFor="firstName"
              className="absolute left-3 text-muted-foreground pointer-events-none transition-all
                top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
                peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
            >
              First Name
            </label>
          </div>
          <div className="relative">
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder=" "
              className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              required
              autoComplete="family-name"
            />
            <label
              htmlFor="lastName"
              className="absolute left-3 text-muted-foreground pointer-events-none transition-all
                top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
                peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
            >
              Last Name
            </label>
          </div>
        </div>

        <div className="relative">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            required
            autoComplete="email"
          />
          <label
            htmlFor="email"
            className="absolute left-3 text-muted-foreground pointer-events-none transition-all
              top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
          >
            Email
          </label>
        </div>

        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 pr-10 sm:pr-12 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-2 sm:p-2.5"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <label
            htmlFor="password"
            className="absolute left-3 text-muted-foreground pointer-events-none transition-all
              top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
          >
            Password
          </label>
        </div>

        {error && (
          <p className="text-xs sm:text-sm text-red-600 leading-relaxed">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3.5 sm:py-3 md:py-3.5 px-4 rounded-md text-base sm:text-lg transition-colors duration-300 inline-flex items-center justify-center"
        >
          {pending ? 'Processing...' : 'Sign Up'}
        </button>
      </form>

      <SocialProviders
        onSocial={handleSocial}
        pending={pending}
        providers={['google']}
      />

      <p className="mt-6 text-xs sm:text-sm md:text-base text-gray-600 text-center leading-relaxed max-w-prose mx-auto px-2 sm:px-0">
        Already have an account?{' '}
        <button
          onClick={() => navigate('/login')}
          className="font-semibold text-primary hover:text-primary-dark text-xs sm:text-sm"
          type="button"
        >
          Log in here
        </button>
      </p>
    </AuthCard>
  );

  const signupIntro = (
    <AuthBrandIntro
      title="Create your account"
      description="Unlock dashboards for orders, stock alerts, and staff scheduling the moment you join the TechnoMart team."
      className="w-full max-w-xl px-3 sm:px-6 lg:px-8"
      contentClassName="space-y-1 sm:space-y-3 text-center sm:text-left"
      titleClassName="text-[20px] sm:text-4xl"
      descriptionClassName="text-[9px] sm:text-sm"
    />
  );

  return (
    <PageTransition>
      <AuthPageShell
        backgroundImage={AUTH_PAGE_DEFAULT_BACKGROUND}
        waveImage="/images/b1bc6b54-fe3f-45eb-8a39-005cc575deef.png"
        paddingClassName="px-4 sm:px-6 lg:px-10 xl:px-16 py-10 sm:py-12 lg:py-16"
        gridClassName="gap-2 sm:gap-10 lg:gap-16"
        formWrapperClassName="order-2 md:order-1 w-full flex justify-center px-2 sm:px-4 md:px-0"
        asideWrapperClassName="order-1 md:order-2 mb-2 sm:mb-0 flex justify-center px-2 sm:px-4"
        formSlot={signupCard}
        asideSlot={signupIntro}
      />
    </PageTransition>
  );
};

export default SignupPage;
