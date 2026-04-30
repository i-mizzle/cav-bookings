'use client';

import { useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import TextField from './form/TextField';
import Checkbox from './form/Checkbox';

interface FormData {
  name: string;
  email: string;
  subscribedToNewsletter: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  recaptcha?: string;
  submit?: string;
  details?: string;
  hint?: string;
}

interface Validations {
  [key: string]: boolean;
}

export default function WaitlistForm() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subscribedToNewsletter: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Validations = {};

    if (!formData.name.trim()) {
      newErrors.name = true;
    }

    if (!formData.email.trim()) {
      newErrors.email = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = true;
    }

    setErrors(newErrors);
    setValidationErrors(newErrors)
    return Object.keys(newErrors).length === 0;
  };

  const [validationErrors, setValidationErrors] = useState<Validations>({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    if (!executeRecaptcha) {
      setErrors({ recaptcha: 'reCAPTCHA is not ready' });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await executeRecaptcha('waitlist');

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ 
          submit: data.message || 'Failed to join waitlist',
          details: data.details,
          hint: data.hint
        });
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subscribedToNewsletter: true,
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: e.currentTarget.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  if (submitSuccess) {
    return (
      <div className="w-full">
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-accent p-8 text-center">
          <h3 className="text-2xl font-bold text-accent mb-3">Success! 🎉</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Thank you for joining the AgroTrace NG waitlist!
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Check your email for confirmation and updates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      <p className='text-sm text-at-black dark:text-at-white'>Please provide your name and email address below to join our waitlist.</p>
      {/* Name Field */}
      <div className='w-full'>
        <TextField
          inputLabel="Name"
          fieldId="specialty"
          inputType="text"
          preloadValue={formData.name || ''}
          inputPlaceholder={'Your full name'}
          hasError={validationErrors && validationErrors.name}
          returnFieldValue={(value) => {setFormData({...formData, name: value as string})}} 
          requiredField={true} 
          disabled={false}
        />
      </div>

      {/* Email Field */}
      <div className='w-full'>
        <TextField
          inputLabel="Email Address"
          fieldId="specialty"
          inputType="text"
          preloadValue={formData.email || ''}
          inputPlaceholder={'Your active email address'}
          hasError={validationErrors && validationErrors.email}
          returnFieldValue={(value) => {setFormData({...formData, email: value as string})}} 
          requiredField={true} 
          disabled={false}
        />
      </div>

      {/* Newsletter Checkbox */}
      <div className='w-full mt-4 mb-4'>
        <Checkbox
          checkboxLabel={`Send me notifications and newsletters about the product`}
          checkboxToggleFunction={()=>{
              setFormData({...formData, subscribedToNewsletter: !formData.subscribedToNewsletter})
          }} 
          isChecked={formData.subscribedToNewsletter} 
          hasError={false} 
        />
        </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-3 bg-accent rounded text-black font-bold text-base hover:bg-[#00C470] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-black mt-2"
      >
        {isSubmitting ? 'Joining...' : 'Join the waitlist & Get Notified'}
      </button>

      {/* Error Messages */}
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 p-5 mt-6 space-y-2">
          <p className="text-red-700 dark:text-red-300 text-sm font-semibold">{errors.submit}</p>
          {errors.details && (
            <p className="text-red-600 dark:text-red-400 text-xs">Error details: {errors.details}</p>
          )}
          {errors.hint && (
            <p className="text-orange-600 dark:text-orange-400 text-xs mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              💡 {errors.hint}
            </p>
          )}
        </div>
      )}
      {errors.recaptcha && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 p-5 mt-6">
          <p className="text-red-700 dark:text-red-300 text-sm">{errors.recaptcha}</p>
        </div>
      )}

      {/* reCAPTCHA Notice */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4">
        This site is protected by reCAPTCHA and the Google{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
          Terms of Service
        </a>{' '}
        apply.
      </p>
    </form>
  );
}
