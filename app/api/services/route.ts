import { connectToDatabase } from "@/lib/mongodb";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const services = await Service.find({})
      .sort({ order: 1, name: 1 })
      .lean();

    return Response.json({
      services: services.map((service) => ({
        id: String(service._id),
        name: service.name,
        slug: service.slug,
        description: service.description,
        pricing: service.pricing,
        packages: service.packages,
        duration: service.duration,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
        createdAt: service.createdAt?.toISOString?.() ?? null,
        updatedAt: service.updatedAt?.toISOString?.() ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load services.";
    return Response.json({ error: message }, { status: 500 });
  }
}