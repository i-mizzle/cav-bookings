import { connectToDatabase } from "@/lib/mongodb";
import { serviceSeedData } from "@/lib/seeds/services";
import { Service } from "@/models/Service";

async function seedServices() {
  await connectToDatabase();

  const operations = serviceSeedData.map((service) => ({
    updateOne: {
      filter: { slug: service.slug },
      update: {
        $set: service,
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Service.bulkWrite(operations);
  }

  const count = await Service.countDocuments({
    slug: { $in: serviceSeedData.map((service) => service.slug) },
  });

  console.log(`Seeded ${count} services.`);
}

seedServices()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Failed to seed services.", error);
    process.exit(1);
  });