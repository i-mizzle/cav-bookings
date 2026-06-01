import React, { ReactNode } from 'react'

interface FormButtonProps {
    buttonLabel: ReactNode
    disabled?: boolean
    buttonAction: () => void 
    processing: boolean
    type?: "submit" | "reset" | "button" | undefined
}

const FormButton: React.FC<FormButtonProps> = ({type="button", buttonLabel, buttonAction, disabled, processing}) => {
  return (
        <button 
            type={type}
            disabled={processing || disabled} 
            onClick={()=>{buttonAction()}} 
            className='w-full p-4 rounded-lg bg-cav-gold text-cav-black text-sm transition duration-200 hover:bg-cav-dark-gold font-[550] flex items-center justify-center'
        >
            {processing ? <div className='btn-loader' /> : buttonLabel}
            {/* {processing ? <div className='btn-loader' /> : buttonLabel as React.ReactNode} */}
        </button>
  )
}

export default FormButton