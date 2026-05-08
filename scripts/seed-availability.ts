import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function seedAvailability() {
  const [{ connectToDatabase }, { availabilitySeedData }, { Availability }] = await Promise.all([
    import("@/lib/mongodb"),
    import("@/lib/seeds/availability"),
    import("@/models/Availability"),
  ]);

  await connectToDatabase();

  await Availability.deleteMany({});

  if (availabilitySeedData.length > 0) {
    await Availability.insertMany(availabilitySeedData);
  }

  const count = await Availability.countDocuments({});

  console.log(`Seeded ${count} availability records.`);
}

seedAvailability()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Failed to seed availability.", error);
    process.exit(1);
  });