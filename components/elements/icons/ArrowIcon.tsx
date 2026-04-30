import React from 'react'
import { IconProps } from './interfaces'

const ArrowIcon: React.FC<IconProps> = ({className}) => {
  return (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 12h16M4 12l4-4m-4 4 4 4"
    ></path>
  </svg>

  )
}

export default ArrowIcon