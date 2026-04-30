import { Dialog, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import React, { FC, Fragment, ReactNode } from 'react'
import CloseIcon from '../elements/icons/CloseIcon'

interface ModalWrapperProps {
    children: ReactNode 
    shown: boolean
    closeFunction: ()=>void 
    dialogTitle: string
    maxWidthClass: string
}

const ModalWrapper: FC<ModalWrapperProps> = ({
    children, shown, closeFunction, dialogTitle, maxWidthClass
}) => {
    return (
        <Transition appear show={shown} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-50 overflow-y-auto bg-black/70 dark:bg-black/85"
                onClose={closeFunction}
            >
                <div className="min-h-screen px-4 text-center">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0" />
                    </TransitionChild>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span
                        className="inline-block h-screen align-middle"
                        aria-hidden="true"
                    >
                        &#8203;
                    </span>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div className={`relative inline-block ${maxWidthClass} p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-at-black shadow-xl rounded-lg dark:border dark:border-at-dark-gray/20`}>
                            <button onClick={()=>{closeFunction()}} className='absolute top-3.75 right-3.75 text-gray-600 hover:text-gray-500'>
                                <CloseIcon className={`w-5 h-5`} />
                            </button>
                            {dialogTitle && dialogTitle !== '' && <DialogTitle
                                as="h3"
                                className="text-md font-medium leading-6 mb-4"
                            >
                                {dialogTitle}
                            </DialogTitle>}
                            <div className="mt-2">
                                {children}
                            </div>
                        </div>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}

export default ModalWrapper