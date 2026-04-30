import React from 'react'
import CheckIcon from '../icons/CheckIcon'

interface CheckboxProps {
  checkboxLabel: string
  checkboxToggleFunction: (e: unknown) => void
  isChecked: boolean
  hasError: boolean
}

const Checkbox: React.FC<CheckboxProps> = ({
  checkboxLabel, 
  checkboxToggleFunction, 
  isChecked, 
  hasError}) => {
  return (
    <div onClick={checkboxToggleFunction} className='w-full flex items-start gap-x-3 my-2 cursor-pointer'>
      <div className='w-6.5'>
        <button 
            type='button'
            className={`mt-0.5 flex items-center justify-center  transition duration-200 text-white cursor-pointer 
            ${isChecked ? 'bg-accent border-accent' : 'bg-transparent border-gray-400'}
            ${hasError ? 'border-red-600' : 'border-gray-400'}`
          } 
          style={{width: '25px', height: '25px'}}
          onClick={checkboxToggleFunction}
        >
          {isChecked && <CheckIcon className='w-5 h-5 text-at-black' />}
        </button>
      </div>
      <label className={`text-locum-black text-[14px] cursor-pointer mt-0.75`}>
        {checkboxLabel}
      </label>
    </div>
  )
}

export default Checkbox