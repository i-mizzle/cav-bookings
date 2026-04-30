import type { FC } from 'react'

import { getInferredPriceDue, getInferredTotalPrice } from '@/lib/servicePricing'

type SelectedPackageData = {
  name: string
  pricing: number
}

type CustomerData = {
  name: string
  phone: string
  emailAddress: string
}

type BookingData = {
  date: string
  timeSlot: string
}

type SelectedServiceData = {
  name: string
  pricing: {
    type: string
    amount: number
    cycle?: string
  }
  upfrontPercentage?: number
}

interface SelectedServiceProps {
  selectedPackageData: SelectedPackageData | null
  selectedServiceData: SelectedServiceData | null
  cyclesSelected: number
  customerData?: CustomerData
  bookingData?: BookingData
}

const formatDateLabel = (dateValue?: string) => {
  if (!dateValue) return "Not selected"

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${dateValue}T00:00:00`))
}

const formatTimeSlotLabel = (timeSlotValue?: string) => {
  if (!timeSlotValue) return "Not selected"

  const [startTime, endTime] = timeSlotValue.split("-")

  if (!startTime || !endTime) return timeSlotValue

  const formatSingleTime = (time: string) => {
    const [hour, minute] = time.split(":").map(Number)
    const timeValue = new Date()
    timeValue.setHours(hour, minute, 0, 0)

    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(timeValue)
  }

  return `${formatSingleTime(startTime)} to ${formatSingleTime(endTime)}`
}

const hasCustomerData = (customerData?: CustomerData) => {
  if (!customerData) return false

  return [customerData.name, customerData.emailAddress, customerData.phone].some((value) => value.trim().length > 0)
}

const hasBookingData = (bookingData?: BookingData) => {
  if (!bookingData) return false

  return [bookingData.date, bookingData.timeSlot].some((value) => value.trim().length > 0)
}

const SelectedServiceOptions: FC<SelectedServiceProps> = ({ selectedPackageData, selectedServiceData, cyclesSelected, customerData, bookingData }) => {
  const inferredTotalPrice = getInferredTotalPrice(selectedServiceData, selectedPackageData, cyclesSelected)
  const duePercentage = selectedServiceData?.upfrontPercentage ?? 100
  const inferredPriceDue = getInferredPriceDue(selectedServiceData, selectedPackageData, cyclesSelected)
  const shouldShowBookingDetails = hasCustomerData(customerData) || hasBookingData(bookingData)

  return (
    <div className="p-4 rounded-lg bg-black/40 border-2 border-cav-medium-gray shadow-lg shadow-black/50">
        {/* <p className="text-[10px] text-cav-light-gray uppercase font-mono tracking-[0.8em] mb-2">Your Selection</p> */}
        <p className="text-md text-cav-gold font-mono font-semibold">{selectedServiceData?.name ?? "No service selected"}</p>
        
        {selectedPackageData && <p className="text-sm text-white font-sans">{selectedPackageData.name}</p>}
        
        {selectedServiceData?.pricing.type === 'rolling' && <p className="text-sm text-white font-sans">{cyclesSelected} {selectedServiceData.pricing.cycle}s</p>}

        {selectedServiceData && (
            <>
            <p className="text-sm text-gray-300 font-mono mt-3">Total: N{inferredTotalPrice.toLocaleString()}</p>
            <p className="text-sm text-cav-gold font-mono font-semibold">Due now: N{inferredPriceDue.toLocaleString()}</p>
            {duePercentage < 100 && <p className="text-xs text-gray-400 font-sans">({duePercentage}% upfront payment)</p>}
            </>
        )}

        {shouldShowBookingDetails && <div className="mt-4 space-y-2 border-t border-cav-medium-gray/60 pt-4 text-xs font-mono text-cav-light-gray">
          {customerData && <>
            <p>Name: <span className="text-white">{customerData?.name || "Not provided"}</span></p>
            <p>Email: <span className="text-white">{customerData?.emailAddress || "Not provided"}</span></p>
            <p>Phone: <span className="text-white">{customerData?.phone || "Not provided"}</span></p>
          </>}
          {bookingData && <>
            <p>Date: <span className="text-white">{formatDateLabel(bookingData?.date)}</span></p>
            <p>Time slot: <span className="text-white">{formatTimeSlotLabel(bookingData?.timeSlot)}</span></p>
          </>}
        </div>}
    </div>
  )
}

export default SelectedServiceOptions