import type { FC } from 'react'

type SelectedPackageData = {
  name: string
  pricing: number
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
  customerData?: {}
}

const SelectedServiceOptions: FC<SelectedServiceProps> = ({ selectedPackageData, selectedServiceData, cyclesSelected }) => {
  const inferredTotalPrice = selectedServiceData
  ? selectedServiceData.pricing.type === "packaged"
    ? selectedPackageData?.pricing ?? selectedServiceData.pricing.amount
    : selectedServiceData.pricing.type === "rolling"
      ? selectedServiceData.pricing.amount * cyclesSelected
      : selectedServiceData.pricing.amount
  : 0

  const duePercentage = selectedServiceData?.upfrontPercentage ?? 100
  const inferredPriceDue = Math.round((inferredTotalPrice * duePercentage) / 100)
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
    </div>
  )
}

export default SelectedServiceOptions