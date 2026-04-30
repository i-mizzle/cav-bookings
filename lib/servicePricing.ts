export type ServicePricing = {
  type: string
  amount: number
  cycle?: string
}

export type SelectedPackageLike = {
  pricing: number
} | null

export type SelectedServiceLike = {
  pricing: ServicePricing
  upfrontPercentage?: number
} | null

export const getInferredTotalPrice = (
  selectedServiceData: SelectedServiceLike,
  selectedPackageData: SelectedPackageLike,
  cyclesSelected: number,
) => {
  if (!selectedServiceData) return 0

  if (selectedServiceData.pricing.type === "packaged") {
    return selectedPackageData?.pricing ?? selectedServiceData.pricing.amount
  }

  if (selectedServiceData.pricing.type === "rolling") {
    return selectedServiceData.pricing.amount * Math.max(1, cyclesSelected)
  }

  return selectedServiceData.pricing.amount
}

export const getInferredPriceDue = (
  selectedServiceData: SelectedServiceLike,
  selectedPackageData: SelectedPackageLike,
  cyclesSelected: number,
) => {
  const inferredTotalPrice = getInferredTotalPrice(
    selectedServiceData,
    selectedPackageData,
    cyclesSelected,
  )
  const duePercentage = selectedServiceData?.upfrontPercentage ?? 100

  return Math.round((inferredTotalPrice * duePercentage) / 100)
}