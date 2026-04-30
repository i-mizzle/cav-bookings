export const serviceSeedData = [
  {
    name: "Event coverage",
    slug: "coverage",
    description:
      "Social media-focused event coverage with edited video deliverables tailored to your content goals.",
    pricing: {
      amount: 70000,
      type: "packaged",
    },
    packages: [
      {
        name: "1 video",
        pricing: 70000,
      },
      {
        name: "5 videos",
        pricing: 300000,
      },
      {
        name: "10 videos",
        pricing: 450000,
      },
      {
        name: "15 videos",
        pricing: 600000,
      },
    ],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    name: "Event Facilitation",
    slug: "facilitation",
    description:
      "Professional speaking and presenting support to host, moderate, or lead your event confidently.",
    pricing: {
      amount: 100000,
      type: "rolling",
      cycle: "hour",
    },
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    name: "Online Classes",
    slug: "online-classes",
    description:
      "Hands-on training on video creation, video editing, and social media content production.",
    pricing: {
      amount: 50000,
      type: "rolling",
      cycle: "week",
    },
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    name: "Consultation",
    slug: "consultation",
    description:
      "One-on-one advisory sessions to help you plan and improve your content and communication strategy.",
    pricing: {
      amount: 20,
      type: "rolling",
      cycle: "hour",
    },
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
] as const;