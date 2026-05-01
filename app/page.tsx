"use client"
import TextField from "@/components/elements/form/TextField";
import SelectedServiceOptions from "@/components/elements/SelectedServiceOptions";
import ArrowIcon from "@/components/elements/icons/ArrowIcon";
import BookingCalendar from "@/components/elements/BookingCalendar";
import CheckIcon from "@/components/elements/icons/CheckIcon";
import EllipsesVerticalIcon from "@/components/elements/icons/EllipsesVerticalIcon";
import { getInferredPriceDue } from "@/lib/servicePricing";
import Script from "next/script";
import { useState } from "react";
import { Validations } from "@/lib/interfaces";
import { toast } from "sonner";

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

  const services = [
    {
      name: "Event coverage", // for social media content creation
      slug: 'coverage',
      description: "Social media-focused event coverage with edited video deliverables tailored to your content goals.",
      upfrontPercentage: 70,
      pricing: {
        amount: 70000,
        type: "packaged", // rolling, fixed, packaged
        // cycle: ""
      },
      packages: [
        {
          name: "1 video",
          pricing: 70000
        },
        {
          name: "5 videos",
          pricing: 300000
        },
        {
          name: "10 videos",
          pricing: 450000
        },
        {
          name: "15 videos",
          pricing: 600000
        }
      ]
    },
    {
      name: "Event Facilitation", // speaking or presenting at an event
      slug: 'facilitation',
      description: "Professional speaking and presenting support to host, moderate, or lead your event confidently.",
      pricing: {
        amount: 100000,
        type: "rolling",
        cycle: "hour"
      }
    },
    {
      name: "Online Classes", // teaching video creation, editing and social media content creation
      description: "Hands-on training on video creation, video editing, and social media content production.",
      slug: 'online-classes',
      pricing: {
        amount: 50000,
        type: "rolling",
        cycle: "week"
      }
    },
    {
      name: "Consultation",
      slug: 'consultation',
      description: "One-on-one advisory sessions to help you plan and improve your content and communication strategy.",
      pricing: {
        amount: 20000,
        type: "rolling",
        cycle: "hour"
      },
    },
  ]

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
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [cyclesSelected, setCyclesSelected] = useState<number>(1)

  const changeSelectedService = (serviceIndex: number) => {
    if (selectedService === serviceIndex) return
    setSelectedService(serviceIndex)
    setSelectedPackage(null)
    setCyclesSelected(1)
    setBookingPayload((prev) => ({
      ...prev,
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
    setActiveStep(step)
  }

  const selectedServiceData = selectedService !== null ? services[selectedService] : null

  const selectedPackageData = selectedServiceData?.packages && selectedPackage !== null
    ? selectedServiceData.packages[selectedPackage]
    : null

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
  const inferredPriceDue = getInferredPriceDue(selectedServiceData, selectedPackageData, cyclesSelected)
  const canProceedToPayment = Boolean(
    selectedServiceData && userPayload.email.trim() && bookingPayload.date && bookingPayload.timeSlot && inferredPriceDue > 0,
  )

  const handlePaymentSuccess = (transaction: PaystackSuccessTransaction) => {
    toast.success("Payment initialized successfully.", {
      description: `Reference: ${transaction.reference}`,
    })
  }

  const handleProceedToPayment = () => {
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

    // toast.message("Opening secure payment", {
    //   description: "Complete the transaction in the Paystack window.",
    // })

    const popup = new window.PaystackPop()

    popup.newTransaction({
      key: paystackPublicKey,
      email: userPayload.email.trim(),
      amount: inferredPriceDue * 100,
      firstname: userPayload.name.trim() || undefined,
      phone: userPayload.phone.trim() || undefined,
      onSuccess: handlePaymentSuccess,
      onCancel: () => {
        toast.info("Payment was cancelled.")
      },
    })
  }

    
  return (
    <div className="w-full bg-cav-black p-6 min-h-screen h-inherit relative pb-10">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
      {/* <div className="w-full h-[2vh]"></div> */}
      <div className="flex items-start gap-x-2 bg-transparent">
        <div className="w-full"></div>
        <button className="rounded-full w-10 h-10 bg-cav-medium-gray text-cav-light-gray flex items-center justify-center shadow-xl shadow-black/30">
          <EllipsesVerticalIcon className="w-6 h-6" />
        </button>
      </div>

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
          {services.map((service, serviceIndex) => (
            <div onClick={()=>{changeSelectedService(serviceIndex)}} key={serviceIndex} className={`relative transition-all duration-200 px-4 py-4 rounded-xl shadow-xl my-4 border-2 ${selectedService === serviceIndex ? 'border-cav-gold/50 bg-black/50 shadow-black/50' : 'border-transparent shadow-transparent bg-cav-dark-gray'}`}>
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

              {service.packages && selectedService === serviceIndex && 
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
          <p className="mb-4 text-white font-sans text-sm">Please see your booking summary below. You can use the back button if you need to change any thing or just click the "Proceed to payment" button when u're ready</p>
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
      
    </div>
  );
}
