import React, { useState, useEffect } from 'react'

interface TextFieldProps {
    requiredField: boolean
    inputLabel: string
    inputPlaceholder: string
    fieldId?: string 
    inputType: string 
    inputName?: string
    autoComplete?: string
    hasError: boolean 
    returnFieldValue: (event: unknown) => void 
    preloadValue: string
    disabled: boolean
    maxLength?: number
}

const TextField: React.FC<TextFieldProps> = ({
    requiredField,
    inputLabel, 
    inputPlaceholder,
    fieldId, 
    inputType,
    inputName,
    autoComplete,
    hasError, 
    returnFieldValue, 
    preloadValue, 
    disabled, 
    maxLength
}) => {
    const [fieldValue, setFieldValue] = useState<string>(preloadValue)

    // Sync fieldValue with preloadValue if it changes externally
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

            <input 
                id={fieldId} 
                name={inputName}
                type={inputType}
                autoComplete={autoComplete}
                maxLength={maxLength}
                className={`rounded py-4 px-4 bg-black/20 text-xs block w-full focus:border-black focus:outline-none border transition duration-200 dark:focus:bg-transparent dark:hover:bg-black/10 font-mono placeholder:font-mono ${hasError ? 'border-red-600/30' : 'border-black/20'}`} 
                onChange={(e) => setValue(e.target.value)}
                value={fieldValue}
                disabled={disabled}
                placeholder={inputPlaceholder}
            />
        </div>
    )
}

export default TextField;
