import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageTransition from '@/components/PageTransition';
import AuthCard from '@/components/auth/AuthCard';
import AuthPageShell, {
  AUTH_PAGE_DEFAULT_BACKGROUND,
} from '@/components/auth/AuthPageShell';
import AuthBrandIntro from '@/components/auth/AuthBrandIntro';
import authService from '@/api/services/authService';

const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const alertRef = useRef(null);

  const token = query.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if ((error || success) && alertRef.current) {
      alertRef.current.focus();
    }
  }, [error, success]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    try {
      let res;
      if (token) {
        res = await authService.resetPassword(token, password);
      } else {
        if (!email || !code) {
          setError('Email and code are required.');
          setPending(false);
          return;
        }
        res = await authService.resetPasswordWithCode(email, code, password);
      }
      if (res?.success) {
        setSuccess('Your password has been reset. You can now log in.');
      } else {
        setError(res?.message || 'Reset failed. The link may have expired.');
      }
    } catch (err) {
      setError(err?.message || 'Could not reset password.');
    } finally {
      setPending(false);
    }
  };

  const introContent = (
    <AuthBrandIntro
      title="Create a new password"
      description="Choose a strong password to keep your account secure before returning to the dashboard."
      className="w-full max-w-xl px-3 sm:px-6 lg:px-8"
      contentClassName="space-y-1 sm:space-y-3 text-center sm:text-left"
      titleClassName="text-[20px] sm:text-4xl"
      descriptionClassName="text-[9px] sm:text-sm"
    />
  );

  const resetCard = (
    <AuthCard
      title="Reset Password"
      compact
      className="!max-w-full sm:!max-w-md lg:!max-w-lg"
      cardClassName="shadow-2xl lg:p-8"
    >
      <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed max-w-prose">
        Choose a new password for your account.
      </p>

      {(error || success) && (
        <div
          className={`p-3 sm:p-4 mb-4 rounded-lg text-xs sm:text-sm leading-relaxed ${
            success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
          role="alert"
          tabIndex={-1}
          ref={alertRef}
        >
          {success || error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 sm:space-y-5 lg:space-y-6"
        noValidate
        aria-busy={pending || undefined}
      >
        {!token && (
          <>
            <div className="relative">
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                required
                disabled={pending}
                autoComplete="username email"
              />
              <label
                htmlFor="reset-email"
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
                id="reset-code"
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\s+/g, '').slice(0, 6))
                }
                placeholder=" "
                className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                required
                disabled={pending}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
              />
              <label
                htmlFor="reset-code"
                className="absolute left-3 text-muted-foreground pointer-events-none transition-all
                  top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
                  peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
              >
                6-digit code
              </label>
            </div>
          </>
        )}
        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 pr-12 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            required
            minLength={8}
            disabled={pending}
            autoComplete="new-password"
          />
          <label
            htmlFor="reset-password"
            className="absolute left-3 text-muted-foreground pointer-events-none transition-all
              top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
          >
            New password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.7rem] sm:text-xs text-gray-500 hover:text-gray-700 focus:outline-none px-2 py-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="relative">
          <input
            id="reset-confirm"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 pr-12 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            required
            minLength={8}
            disabled={pending}
            autoComplete="new-password"
          />
          <label
            htmlFor="reset-confirm"
            className="absolute left-3 text-muted-foreground pointer-events-none transition-all
              top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
          >
            Confirm new password
          </label>
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.7rem] sm:text-xs text-gray-500 hover:text-gray-700 focus:outline-none px-2 py-1"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3.5 sm:py-3 md:py-3.5 px-4 rounded-md text-base sm:text-lg transition-colors duration-300 inline-flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <Spinner /> Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <Link
          to="/login"
          className="text-primary underline underline-offset-2 font-semibold text-center sm:text-left"
        >
          Back to Login
        </Link>
        <button
          className="text-primary hover:text-primary-dark text-center sm:text-right"
          onClick={() => navigate('/forgot-password')}
          type="button"
        >
          Resend link
        </button>
      </div>
    </AuthCard>
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
        formSlot={resetCard}
        asideSlot={introContent}
      />
    </PageTransition>
  );
};

export default ResetPasswordPage;
