import React, { useEffect, useState } from 'react'

interface PasswordFieldProps {
    requiredField: boolean
    inputLabel: string
    inputPlaceholder: string
    fieldId?: string
    inputName?: string
    autoComplete?: string
    hasError: boolean
    returnFieldValue: (event: unknown) => void
    preloadValue: string
    disabled: boolean
}

const PasswordField: React.FC<PasswordFieldProps> = ({
    requiredField,
    inputLabel,
    inputPlaceholder,
    fieldId,
    inputName,
    autoComplete,
    hasError,
    returnFieldValue,
    preloadValue,
    disabled,
}) => {
    const [fieldValue, setFieldValue] = useState<string>(preloadValue)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        setFieldValue(preloadValue);
    }, [preloadValue]);

    const setValue = (value: string) => {
        setFieldValue(value);
        returnFieldValue(value);
    }

    return (
        <div>
            <label 
                className={`text-xs lg:text-md cursor-text z-10 relative py-1 transition mb-1 block font-medium font-mono duration-200  
                ${hasError ? 'text-red-300' : 'text-gray-500'}`}
            >
                {requiredField && <span className='text-red-300'>*</span>} {inputLabel}
            </label>

            <div className={`rounded bg-black/20 border transition duration-200 flex items-center ${hasError ? 'border-red-600/30' : 'border-black/20'} dark:focus-within:bg-transparent dark:hover:bg-black/10`}>
                <input 
                    id={fieldId}
                    name={inputName}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    className="py-4 px-4 bg-transparent text-xs block w-full focus:outline-none font-mono placeholder:font-mono text-white"
                    onChange={(e) => setValue(e.target.value)}
                    value={fieldValue}
                    disabled={disabled}
                    placeholder={inputPlaceholder}
                />

                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={disabled}
                    className="px-4 text-[11px] font-mono font-semibold text-cav-light-gray transition duration-200 hover:text-cav-gold disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {showPassword ? 'Hide' : 'Show'}
                </button>
            </div>
        </div>
    )
}

export default PasswordField