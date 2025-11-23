import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

const ForgotPasswordPage = () => {
  // Using authService to trigger backend password reset email

  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugLink, setDebugLink] = useState('');
  const alertRef = useRef(null);

  useEffect(() => {
    if ((error || success) && alertRef.current) {
      alertRef.current.focus();
    }
  }, [error, success]);

  const validateEmail = (val) => {
    if (!val) return 'Email is required.';
    // Simple email format check
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    return ok ? '' : 'Please enter a valid email address.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    if (emailErr) return;

    setPending(true);
    try {
      const res = await authService.requestPasswordReset(email);
      if (res?.debugResetLink) setDebugLink(res.debugResetLink);
      setSuccess(
        'If an account exists for this email, a verification code has been sent.'
      );
      try {
        sessionStorage.setItem('reset_email', email);
      } catch {}
      // Navigate to code entry page for the new flow
      setTimeout(() => {
        window.location.href = `/reset-code?email=${encodeURIComponent(email)}`;
      }, 400);
    } catch (err) {
      setError(
        'Something went wrong while sending the reset email. Please try again.'
      );
    } finally {
      setPending(false);
    }
  };

  const formCard = (
    <AuthCard
      title="Forgot Password"
      compact
      className="!max-w-full sm:!max-w-md lg:!max-w-lg"
      cardClassName="shadow-2xl lg:p-8"
    >
      <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed max-w-prose">
        Enter your email address and we will send you a link to reset your
        password.
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
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-5 lg:space-y-6"
        noValidate
        aria-busy={pending || undefined}
      >
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder=" "
            className="peer w-full h-12 sm:h-11 px-3 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            required
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            disabled={pending}
            autoFocus
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
          {emailError && (
            <p
              id="email-error"
              className="mt-1 text-xs sm:text-sm text-red-700"
            >
              {emailError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3.5 sm:py-3 md:py-3.5 px-4 rounded-md text-base sm:text-lg transition-colors duration-300 inline-flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <Spinner /> Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      {debugLink ? (
        <div className="mt-4 p-3 sm:p-4 bg-yellow-50 text-yellow-700 rounded text-xs sm:text-sm leading-relaxed break-all">
          Developer only: Reset link
          <div className="mt-1">
            <a href={debugLink} className="underline break-all">
              {debugLink}
            </a>
          </div>
        </div>
      ) : null}

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
      title="Reset your password"
      description="We will email you a secure link so you can set a new password and get back to serving customers."
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

export default ForgotPasswordPage;
