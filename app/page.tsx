"use client"
import TextField from "@/components/elements/form/TextField";
import SelectedServiceOptions from "@/components/elements/SelectedServiceOptions";
import ArrowIcon from "@/components/elements/icons/ArrowIcon";
import BookingCalendar from "@/components/elements/BookingCalendar";
import CheckIcon from "@/components/elements/icons/CheckIcon";
import EllipsesVerticalIcon from "@/components/elements/icons/EllipsesVerticalIcon";
import { getInferredPriceDue } from "@/lib/servicePricing";
import Script from "next/script";
import { useEffect, useState } from "react";
import { Validations } from "@/lib/interfaces";
import { toast } from "sonner";
import Spinner from "@/components/elements/icons/Spinner";
import Image from "next/image";

type PaystackSuccessTransaction = {
  reference: string
  [key: string]: unknown
}

type PaystackInline = {
  newTransaction: (options: {
    key: string
    email: string
    amount: number
    firstname?: string
    phone?: string
    onSuccess: (transaction: PaystackSuccessTransaction) => void
    onCancel?: () => void
  }) => void
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackInline
  }
}

interface UserPayload {
  name: string
  phone: string
  email: string
  eventLocation?: 'abuja' | 'benue'
}

interface BookingPayload {
  date: string
  timeSlot: string
  service: string
  eventType?: 'wedding' | 'corporate' | 'other'
  additionalInfo?: string
}

type ServicePackage = {
  name: string
  pricing: number
}

type ServiceOption = {
  id: string
  name: string
  slug: string
  description: string
  pricing: {
    amount: number
    type: "rolling" | "fixed" | "packaged"
    cycle?: string
  }
  packages?: ServicePackage[]
  upfrontPercentage?: number
  duration: number
  bufferBefore: number
  bufferAfter: number
  createdAt: string | null
  updatedAt: string | null
}

type ServicesResponse = {
  services: ServiceOption[]
}

type BookingApiResponse = {
  id: string
  serviceId: string
  userId: string | null
  start: string
  end: string
  status: "pending" | "confirmed" | "cancelled"
  paymentStatus: "pending" | "paid"
  paymentReference?: string
  googleEventId: string
  meetLink: string
  emailSent?: boolean
  createdAt?: string
  updatedAt?: string
}

type PaymentFlowState = "idle" | "confirming" | "success"

export default function Home() {
  const steps = [
    {
      title: "Select a service",
      description: "Choose one from our services below that best matches what you need."
    },
    {
      title: "Provide your information",
      description: "Fill in your contact details so we can confirm your booking."
    },
    {
      title: "Choose date & time",
      description: "Pick a convenient date and time for your session or event."
    },
    {
      title: "Make payment",
      description: "Complete payment securely to finalize your booking."
    }
  ]

  const [activeStep, setActiveStep] = useState(0)

  const [services, setServices] = useState<ServiceOption[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()

    const loadServices = async () => {
      try {
        const response = await fetch("/api/services", {
          signal: abortController.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to load services.")
        }

        const data = (await response.json()) as ServicesResponse
        setServices(data.services ?? [])
      } catch (error) {
        if (abortController.signal.aborted) return

        console.error("Unable to load services.", error)
        toast.error("Unable to load services right now.", {
          description: "Please refresh the page and try again.",
        })
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingServices(false)
        }
      }
    }

    void loadServices()

    return () => {
      abortController.abort()
    }
  }, [])
  

  const [userPayload, setUserPayload] = useState<UserPayload>({
    name: "",
    phone: "",
    email: "",
    eventLocation: undefined
  })

  const [bookingPayload, setBookingPayload] = useState<BookingPayload>({
    date: "",
    timeSlot: "",
    service: ""
  })

  const formatBookingDate = (date: Date) => {
    const year = date.getUTCFullYear()
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0")
    const day = `${date.getUTCDate()}`.padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [cyclesSelected, setCyclesSelected] = useState<number>(1)
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentFlowState, setPaymentFlowState] = useState<PaymentFlowState>("idle")
  const [confirmedBooking, setConfirmedBooking] = useState<BookingApiResponse | null>(null)

  const changeSelectedService = (serviceIndex: number) => {
    if (selectedService === serviceIndex) return
    setSelectedService(serviceIndex)
    setSelectedPackage(null)
    setCyclesSelected(1)
    setBookingPayload((prev) => ({
      ...prev,
      date: "",
      timeSlot: "",
      service: services[serviceIndex].name
    }))
  }

  const increaseCycle = () => {
    setCyclesSelected((prev) => prev + 1)
  }

  const reduceCycle = () => {
    if (cyclesSelected === 1) return
    setCyclesSelected((prev) => Math.max(1, prev - 1))
  }

  const [validationErrors, setValidationErrors] = useState<Validations>({})

  const validateStepOne = () => {
    const errors: Validations = {}
    if(selectedService === null){
      errors.service = true
      // toast.error('Please select a service')
    }

    if(selectedService !== null && services[selectedService].packages && services[selectedService].packages!.length > 0 && selectedPackage === null) {
      errors.package = true
      // toast.error('Please select a package from the service')
    }

    if(selectedService !== null && services[selectedService].pricing.type === 'rolling' && !cyclesSelected) {
      errors.cycles = true
      // toast.error('Please select a cycle')
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0;

  }

  const validateStepTwo = () => {
    const errors: Validations = {}
    if(userPayload.name === ''){
      errors.name = true
    }
    
    if(userPayload.email === ''){
      errors.email = true
    }

    if(userPayload.phone === ''){
      errors.phone = true
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0;
  }

  const validateStepThree = () => {
    const errors: Validations = {}

    if (!bookingPayload.date) {
      errors.date = true
    }

    if (!bookingPayload.timeSlot) {
      errors.timeSlot = true
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const showStepErrorToast = (step: number) => {
    if (step === 0) {
      toast.error("Select a service before continuing.", {
        description: "Choose a package or duration where required.",
      })
      return
    }

    if (step === 1) {
      toast.error("Complete your contact details.", {
        description: "Name, email, and phone number are required.",
      })
      return
    }

    toast.error("Choose a booking date and time slot.")
  }

  const changeStep = (step: number) => {
    if(activeStep === 0 && step < 0) return
    if(activeStep === steps.length && step > steps.length) return

    if(step > activeStep) {
      if(activeStep === 0 && !validateStepOne()){
        showStepErrorToast(0)
        return
      }
  
      if(activeStep === 1 && !validateStepTwo()){
        showStepErrorToast(1)
        return
      }
  
      if(activeStep === 2 && step > activeStep && !validateStepThree()){
        showStepErrorToast(2)
        return
      }
    }

    setActiveStep(step)
  }

  const selectedServiceData = selectedService !== null ? services[selectedService] : null

  const selectedPackageData = selectedServiceData?.packages && selectedPackage !== null
    ? selectedServiceData.packages[selectedPackage]
    : null

  const bookingStartIso = bookingPayload.date && bookingPayload.timeSlot
    ? `${bookingPayload.date}T${bookingPayload.timeSlot.split("-")[0]}:00.000Z`
    : ""

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
  const inferredPriceDue = getInferredPriceDue(selectedServiceData, selectedPackageData, cyclesSelected)
  const canProceedToPayment = Boolean(
    selectedServiceData && userPayload.email.trim() && bookingPayload.date && bookingPayload.timeSlot && inferredPriceDue > 0 && !submittingPayment,
  )

  const formatUtcCalendarTimestamp = (isoDateTime: string) => {
    return isoDateTime.replace(/[-:]/g, "").replace(".000", "")
  }

  const buildCalendarLink = (booking: BookingApiResponse) => {
    const serviceName = (selectedServiceData?.name ?? bookingPayload.service) || "CAV Booking"
    const details = [
      `Booking for ${serviceName}`,
      `Payment reference: ${booking.paymentReference ?? "Pending"}`,
      booking.meetLink ? `Meet link: ${booking.meetLink}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${serviceName} Booking`,
      dates: `${formatUtcCalendarTimestamp(booking.start)}/${formatUtcCalendarTimestamp(booking.end)}`,
      details,
      ctz: "UTC",
    })

    if (booking.meetLink) {
      params.set("location", booking.meetLink)
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const createPendingBooking = async () => {
    if (!selectedServiceData || !bookingStartIso) {
      throw new Error("Complete the booking details before payment.")
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: bookingStartIso,
        name: userPayload.name.trim(),
        phone: userPayload.phone.trim(),
        email: userPayload.email.trim(),
        serviceId: selectedServiceData.id,
      }),
    })

    const data = (await response.json()) as BookingApiResponse | { error?: string }

    if (!response.ok) {
      throw new Error("error" in data && data.error ? data.error : "Failed to create booking.")
    }

    return data as BookingApiResponse
  }

  const confirmBookingPayment = async (bookingId: string, reference: string) => {
    const response = await fetch("/api/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
        paymentReference: reference,
      }),
    })

    const data = (await response.json()) as BookingApiResponse | { error?: string }

    if (!response.ok) {
      throw new Error("error" in data && data.error ? data.error : "Failed to confirm booking.")
    }

    return data as BookingApiResponse
  }

  const handlePaymentSuccess = async (bookingId: string, transaction: PaystackSuccessTransaction) => {
    if (!bookingId) {
      toast.error("Payment succeeded but no booking was available to confirm.")
      return
    }

    try {
      setPaymentFlowState("confirming")
      const confirmedBooking = await confirmBookingPayment(bookingId, transaction.reference)
      setPendingBookingId(null)
      setConfirmedBooking(confirmedBooking)
      setPaymentFlowState("success")

      toast.success("Booking confirmed successfully.", {
        description: confirmedBooking.meetLink
          ? `Reference: ${transaction.reference}. Meet link created.`
          : `Reference: ${transaction.reference}. Confirmation email sent.`,
      })
    } catch (error) {
      setPaymentFlowState("idle")
      console.error("Unable to confirm booking after payment.", error)
      toast.error("Payment was received but booking confirmation failed.", {
        description: error instanceof Error ? error.message : "Please contact support with your payment reference.",
      })
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleProceedToPayment = async () => {
    if (!selectedServiceData) {
      toast.error("Select a service before payment.")
      return
    }
    if (!userPayload.email.trim()) {
      toast.error("Enter an email address to continue.")
      return
    }
    if (!bookingPayload.date || !bookingPayload.timeSlot) {
      toast.error("Choose a booking date and time first.")
      return
    }
    if (inferredPriceDue <= 0) {
      toast.error("Unable to determine the payment amount.")
      return
    }
    if (!paystackPublicKey) {
      console.error("Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.")
      toast.error("Payment is not configured right now.", {
        description: "Missing Paystack public key.",
      })
      return
    }
    if (!window.PaystackPop) {
      console.error("Paystack InlineJS is not available.")
      toast.error("Payment gateway is still loading.", {
        description: "Please try again in a moment.",
      })
      return
    }

    setSubmittingPayment(true)

    try {
      const pendingBooking = await createPendingBooking()
      setPendingBookingId(pendingBooking.id)

      const popup = new window.PaystackPop()

      popup.newTransaction({
        key: paystackPublicKey,
        email: userPayload.email.trim(),
        amount: inferredPriceDue * 100,
        firstname: userPayload.name.trim() || undefined,
        phone: userPayload.phone.trim() || undefined,
        onSuccess: (transaction) => {
          void handlePaymentSuccess(pendingBooking.id, transaction)
        },
        onCancel: () => {
          setSubmittingPayment(false)
          toast.info("Payment was cancelled.")
        },
      })
    } catch (error) {
      setSubmittingPayment(false)
      console.error("Unable to initialize booking payment.", error)
      toast.error("Unable to start payment.", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  if (paymentFlowState === "confirming") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-cav-black px-6 text-center">
        <Spinner className="h-14 w-14 animate-spin text-cav-light-gray" />
        <h1 className="mt-8 font-mono text-2xl font-semibold tracking-tight text-white">Confirming your booking</h1>
        <p className="mt-3 max-w-sm text-sm font-sans text-cav-light-gray">
          Please hold on while we finalize your booking details and send your confirmation email.
        </p>
      </div>
    )
  }

  if (paymentFlowState === "success" && confirmedBooking) {
    const calendarLink = buildCalendarLink(confirmedBooking)

    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-cav-black px-6 py-10 text-center">
        <div className="w-full max-w-md rounded-2xl border border-cav-medium-gray bg-cav-dark-gray/60 p-6 shadow-xl shadow-black/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cav-gold text-cav-black shadow-lg shadow-black/30">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-mono text-2xl font-semibold tracking-tight text-white">Booking confirmed</h1>
          <p className="mt-3 text-sm font-sans text-cav-light-gray">
            Your booking information has been sent to your email at {userPayload.email.trim() || "your email address"}.
          </p>

          <div className="mt-6 text-left">
            <SelectedServiceOptions
              selectedPackageData={selectedPackageData}
              selectedServiceData={selectedServiceData}
              cyclesSelected={cyclesSelected}
              customerData={userPayload}
              bookingData={bookingPayload}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={calendarLink}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-full bg-cav-gold px-4 text-xs font-semibold text-cav-black shadow-xl shadow-black/30 transition active:bg-cav-black active:text-cav-light-gray"
            >
              Add to Calendar
            </a>
            {confirmedBooking.meetLink && (
              <a
                href={confirmedBooking.meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-full items-center justify-center rounded-full border border-cav-medium-gray bg-transparent px-4 text-xs font-semibold text-cav-light-gray shadow-xl shadow-black/20 transition active:border-cav-gold active:text-cav-gold"
              >
                Open Meet Link
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

    
  return (
    <div className="w-full bg-cav-black p-6 min-h-screen h-inherit relative pb-10">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
      {/* <div className="w-full h-[2vh]"></div> */}
      <div className="flex items-start gap-x-2 bg-transparent mb-10">
        <div className="w-full">
          <div className="relative h-14 w-30">
            <Image
              src={`/logo.svg`}
              alt="CAV logo"
              fill
              sizes="120px"
              className="object-contain"
            />
          </div>
          <p className="text-[10px] tracking-[0.9em] text-cav-light-gray">BOOKINGS</p>
        </div>
        <div className="w-10">
          <button className="rounded-full w-10 h-10 bg-cav-medium-gray text-cav-light-gray flex items-center justify-center shadow-xl shadow-black/30">
            <EllipsesVerticalIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {loadingServices ? 
        <div className="w-full h-[80vh] flex items-center justify-center">
          <Spinner className="w-8 h-8 text-cav-light-gray animate-spin" />
        </div>
        :
        <>
          <div className="w-full pt-2">
            <h1 className="text-2xl font-semibold font-mono text-white tracking-tighter">Hello & Welcome</h1>
            {/* <div className="w-full h-px bg-gray-800 my-1" /> */}
            <h3 className="text-md font-sans font-medium mt-4 mb-1">
              <span className="text-gray-500 text-[14px]">Step {activeStep+1} of {steps.length}<br /></span> {steps[activeStep].title}
            </h3>
            <p className="text-sm text-cav-light-gray font-sans">{steps[activeStep].description}</p>
          </div>

          <div className="pb-20 px-1 mt-5">
            {activeStep === 0 && <>
              {services.length === 0 && (
                <div className="rounded-xl border border-cav-medium-gray bg-cav-dark-gray px-4 py-5 text-center shadow-xl shadow-black/30">
                  <h2 className="font-mono text-lg font-semibold text-white">No services available</h2>
                  <p className="mt-2 text-sm font-sans text-cav-light-gray">
                    We could not find any bookable services right now. Please check back shortly.
                  </p>
                </div>
              )}

              {services.map((service, serviceIndex) => (
                <div onClick={()=>{changeSelectedService(serviceIndex)}} key={serviceIndex} className={`relative transition-all duration-200 px-4 py-4 rounded-xl shadow-xl my-4 border-2 ${selectedService === serviceIndex ? 'border-cav-gold/50 bg-black/50 shadow-black/50' : 'border-transparent shadow-transparent bg-cav-dark-gray/50'}`}>
                  {<span className={`w-5 h-5 transition-all duration-200 rounded-full bg-cav-gold flex items-center justify-center absolute top-4 right-4 shadow-black ${selectedService === serviceIndex ? 'opacity-100' : 'opacity-0'}`}>
                    <CheckIcon className="w-4 h-4 text-black" />
                  </span>}
                  <h3 className="text-[17px] font-semibold font-mono tracking-tighter text-cav-gold">
                    {service.name}
                  </h3>
                  <p className="text-[13px] mt-1 text-cav-light-gray font-sans">{service.description}</p>
                  <h3 className="text-[15px] font-semibold text-cav-gold text-right mt-3 font-mono">
                    {(service.pricing.type === 'packaged' || service.pricing.type === 'rolling') && <span className="text-gray-400 text-xs">from</span>} N{service.pricing.amount.toLocaleString()}{service.pricing.type === 'rolling' && <span className="text-gray-400 text-xs">/{service.pricing.cycle}</span>}
                  </h3>

                  {service.packages && service.packages.length > 0 && selectedService === serviceIndex && 
                    <div className="w-full mt-4">
                      <p className="text-white text-[13px] font-sans font-medium mt-1">Please select one of the packages below</p>
                      <p className="text-xs text-gray-200 mb-4">{service.upfrontPercentage && `${service.upfrontPercentage}% upfront payment is required for all packages` }</p>
                      {service.packages.map((servicePackage, packageIndex) => (
                        <button onClick={()=>{setSelectedPackage(packageIndex)}} key={packageIndex} className={`w-full flex items-center justify-between transition duration-200 my-2 p-4 rounded text-xs font-mono font-semibold text-left ${selectedPackage === packageIndex ? 'bg-cav-gold text-cav-black' : 'bg-cav-medium-gray/30 text-cav-light-gray'}`}>
                          {servicePackage.name } for N{servicePackage.pricing.toLocaleString()}
                          <span className={`w-4 h-4 transition-all duration-200 rounded-full bg-cav-black flex items-center justify-center shadow-lg shadow-black ${selectedPackage === packageIndex ? 'opacity-100' : 'opacity-0'}`}>
                            <CheckIcon className="w-3 h-3 text-cav-gold" />
                          </span>
                        </button>
                      ))}
                    </div>}

                    {service.pricing.type === 'rolling' && selectedService === serviceIndex && 
                    <div className="w-full mt-4">
                      <p className="text-white text-[13px] font-sans font-medium mt-1 mb-4">Please use the -/+ buttons below to choose how many {service.pricing.cycle}s you would like to book</p>
                      <div className="flex items-center justify-between gap-x-2">
                        <button onClick={()=>{reduceCycle()}} disabled={cyclesSelected===1} className={`w-12 h-10 flex items-center justify-center transition duration-200 my-2 p-3 rounded text-xl font-mono font-bold text-left bg-cav-gold disabled:bg-cav-gold/50 disabled:cursor-not-allowed text-cav-black active:bg-cav-dark-gray active:text-white`}>
                          -
                        </button>
                        <div className="w-full bg-cav-dark-gray p-2.5 text-xl rounded text-center">
                          <h1 className="font-mono text-white">{cyclesSelected}</h1>
                        </div>
                        <button onClick={increaseCycle} className={`w-12 h-10 flex items-center justify-center transition duration-200 my-2 p-3 rounded text-xl font-mono font-bold text-left bg-cav-gold text-cav-black active:bg-cav-dark-gray active:text-white`}>
                          +
                        </button>
                      </div>
                    </div>}
                </div>
              ))}
            </>}

            {activeStep === 1 && <>
              <SelectedServiceOptions
                selectedPackageData={selectedPackageData}
                selectedServiceData={selectedServiceData}
                cyclesSelected={cyclesSelected}
                // customerData={userPayload}
                // bookingData={bookingPayload}
              />

              <div className="w-full mt-6">
                <TextField 
                  requiredField={true} 
                  inputLabel={"Name"} 
                  inputPlaceholder={"Your Name"} 
                  inputType={"text"} 
                  hasError={validationErrors.name} 
                  returnFieldValue={(value: unknown) => {
                    setUserPayload((prev) => ({
                      ...prev,
                      name: String(value)
                    }))
                  }} 
                  preloadValue={userPayload.name} 
                  disabled={false} 
                />
              </div>
              <div className="w-full mt-3">
                <TextField 
                  requiredField={true}
                  inputLabel={"Email address"} 
                  inputPlaceholder={"Your active email address"} 
                  inputType={"text"} 
                  hasError={validationErrors.email} 
                  returnFieldValue={(value: unknown) => {
                    setUserPayload((prev) => ({
                      ...prev,
                      email: String(value)
                    }))
                  }} 
                  preloadValue={userPayload.email} 
                  disabled={false} 
                />
              </div>
              <div className="w-full mt-3">
                <TextField 
                  requiredField={true} 
                  inputLabel={"Phone number"} 
                  inputPlaceholder={"Your active phone number (whatsapp preferred)"} 
                  inputType={"text"} 
                  hasError={validationErrors.phone} 
                  returnFieldValue={(value: unknown) => {
                    setUserPayload((prev) => ({
                      ...prev,
                      phone: String(value)
                    }))
                  }} 
                  preloadValue={userPayload.phone} 
                  disabled={false} 
                />
              </div>
            </>}

            {activeStep === 2 && <>
              <SelectedServiceOptions
                selectedPackageData={selectedPackageData}
                selectedServiceData={selectedServiceData}
                cyclesSelected={cyclesSelected}
                // customerData={userPayload}
                // bookingData={bookingPayload}
              />
              <div className="mt-5">
                <BookingCalendar 
                  serviceId={selectedServiceData?.id ?? null}
                  bookingData={bookingPayload}
                  returnSelection={(selection)=>{
                    setBookingPayload((prev) => ({
                      ...prev,
                      date: formatBookingDate(selection.date),
                      timeSlot: selection.time
                    }))
                  }} />
              </div>
            </>}

            {activeStep === 3 && <>
              <h3 className="text-white text-lg font-semibold mb-1 font-mono">Your Booking Summary</h3>
              <p className="mb-4 text-white font-sans text-sm">Please see your booking summary below. You can use the back button if you need to change any thing or just click the "Proceed to payment" button when you're ready</p>
                <SelectedServiceOptions
                  selectedPackageData={selectedPackageData}
                  selectedServiceData={selectedServiceData}
                  cyclesSelected={cyclesSelected}
                  customerData={userPayload}
                  bookingData={bookingPayload}
                />
              </>
            }
          </div>

          <div className="w-full fixed p-4 bg-cav-black left-0 bottom-0 min-h-20 mt-5">
            <div className="flex items-center justify-center w-[40%] gap-x-4 mx-auto my-5">
              {steps.map((_step, stepIndex) => (
                <div key={stepIndex} className={`w-2 h-2 rounded-full ${activeStep === stepIndex ? 'bg-cav-light-gray' : 'bg-cav-medium-gray'}`} />
              ))}
            </div>
            <div className="w-full flex items-center justify-between gap-x-5">
              <button onClick={()=>{changeStep(activeStep-1)}} className="font-mono px-4 text-xs rounded-full h-10 text-cav-light-gray flex items-center justify-center shadow-xl shadow-black/30">
                <ArrowIcon className="w-5 h-5" />
                Back
              </button>
              {activeStep < steps.length - 1 ? <button onClick={()=>{changeStep(activeStep+1)}} className="font-mono transition active:shadow-none active:bg-cav-black active:text-cav-light-gray font-semibold px-4 text-xs rounded-full h-10 bg-cav-gold text-cav-black flex items-center justify-center shadow-xl shadow-black/30">
                Next Step
                <ArrowIcon className="w-5 h-5 rotate-180" />
              </button>
              :
              <button type="button" onClick={handleProceedToPayment} disabled={!canProceedToPayment} className="font-mono transition active:shadow-none active:bg-cav-black active:text-cav-light-gray font-semibold px-4 text-xs rounded-full h-10 bg-cav-gold text-cav-black flex items-center justify-center shadow-xl shadow-black/30 disabled:cursor-not-allowed disabled:bg-cav-gold/50 disabled:text-cav-black/60 disabled:shadow-none">
                Proceed to Payment
                <ArrowIcon className="w-5 h-5 rotate-180" />
              </button>}
            </div>
          </div>
        </>
      }
      
    </div>
  );
}
