import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageTransition from '@/components/PageTransition';
import AuthCard from '@/components/auth/AuthCard';
import AuthPageShell, {
  AUTH_PAGE_DEFAULT_BACKGROUND,
} from '@/components/auth/AuthPageShell';
import AuthBrandIntro from '@/components/auth/AuthBrandIntro';
import authService from '@/api/services/authService';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const SetNewPasswordPage = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const alertRef = useRef(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = useMemo(() => {
    const q = query.get('token') || '';
    if (q) return q;
    try {
      return sessionStorage.getItem('reset_token') || '';
    } catch {
      return '';
    }
  }, [query]);

  useEffect(() => {
    if ((error || success) && alertRef.current) {
      alertRef.current.focus();
    }
  }, [error, success]);

  useEffect(() => {
    if (!success) return undefined;
    const id = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [navigate, success]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
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
      const res = await authService.confirmPasswordReset(token, password);
      if (res?.success) {
        setSuccess('Your password has been reset. You can now log in.');
        try {
          sessionStorage.removeItem('reset_token');
        } catch {}
      } else {
        setError(res?.message || 'Reset failed. The link may have expired.');
      }
    } catch (err) {
      setError(err?.message || 'Could not reset password.');
    } finally {
      setPending(false);
    }
  };

  const formCard = (
    <AuthCard
      title="Set New Password"
      compact
      className="!max-w-full sm:!max-w-md lg:!max-w-lg"
      cardClassName="shadow-2xl lg:p-8"
    >
      <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed max-w-prose">
        Create a secure password to finish resetting your account.
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
        className="space-y-4 sm:space-y-5"
        noValidate
        aria-busy={pending || undefined}
      >
        <div className="relative">
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            required
            minLength={8}
            disabled={pending}
            autoComplete="new-password"
          />
          <label
            htmlFor="new-password"
            className="absolute left-3 text-muted-foreground pointer-events-none transition-all
              top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
          >
            New password
          </label>
        </div>
        <div className="relative">
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            required
            minLength={8}
            disabled={pending}
            autoComplete="new-password"
          />
          <label
            htmlFor="confirm-password"
            className="absolute left-3 text-muted-foreground pointer-events-none transition-all
              top-0 -translate-y-1/2 text-[0.7rem] sm:text-xs px-1 bg-white
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:px-0
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1 peer-focus:bg-white"
          >
            Confirm new password
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3.5 sm:py-3 md:py-3.5 px-4 rounded-md text-base sm:text-lg transition-colors duration-300 inline-flex items-center justify-center"
        >
          {pending ? 'Saving...' : 'Set Password'}
        </button>
      </form>

      <div className="mt-4 text-xs sm:text-sm text-gray-600 text-center">
        <Link
          to="/login"
          className="text-primary underline underline-offset-2 font-semibold"
        >
          Back to Login
        </Link>
      </div>
    </AuthCard>
  );

  const introContent = (
    <AuthBrandIntro
      title="Almost there"
      description="Set a new password so you can sign in and keep the canteen running smoothly."
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
        formSlot={formCard}
        asideSlot={introContent}
      />
    </PageTransition>
  );
};

export default SetNewPasswordPage;
