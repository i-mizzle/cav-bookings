export const serviceSeedData = [
  {
    name: "Event coverage",
    order: 4,
    slug: "coverage",
    description:
      "Social media-focused event coverage with edited video deliverables tailored to your content goals.",
    pricing: {
      amount: 70000,
      type: "packaged",
    },
    meetLinkRequired: false,
    packages: [
      {
        name: "1 video",
        pricing: 100000,
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
    name: "Branded Video/Marketing Content",
    order: 6,
    slug: "marketing-content",
    description:
      "Strategic branded video content designed to strengthen your marketing campaigns and social media presence.",
    pricing: {
      amount: 150000,
      type: "packaged",
    },
    meetLinkRequired: false,
    packages: [
      {
        name: "1 video",
        pricing: 150000,
      },
      {
        name: "4 videos",
        pricing: 500000,
      }
    ],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    order: 2,
    name: "Event Facilitation (Speaking)",
    slug: "facilitation",
    description:
      "Professional speaking and presenting support to host, moderate, or lead your event confidently.",
    pricing: {
      amount: 100000,
      type: "rolling",
      cycle: "hour",
    },
    meetLinkRequired: false,
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    order: 1,
    name: "Online Classes",
    slug: "online-classes",
    description:
      "Hands-on training on video creation, video editing, and social media content production.",
    pricing: {
      amount: 50000,
      type: "rolling",
      cycle: "week",
    },
    meetLinkRequired: true,
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    order: 3,
    name: "Individual content",
    slug: "individual-content",
    description:
      "Custom short-form content created for your brand, including social media reels and other platform-ready videos.",
    pricing: {
      amount: 70000,
      type: "fixed",
      cycle: "",
    },
    meetLinkRequired: false,
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
  {
    order: 0,
    name: "Consultation",
    slug: "consultation",
    description:
      "One-on-one advisory sessions to help you plan and improve your content and communication strategy.",
    pricing: {
      amount: 20000,
      type: "rolling",
      cycle: "hour",
    },
    meetLinkRequired: true,
    packages: [],
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
  },
] as const;
