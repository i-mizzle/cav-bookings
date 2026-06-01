import { connectToDatabase } from "@/lib/mongodb";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

function serializeService(service: Record<string, unknown>) {
  return {
    id: String(service._id),
    order: service.order,
    name: service.name,
    slug: service.slug,
    description: service.description,
    pricing: service.pricing,
    packages: service.packages,
    duration: service.duration,
    bufferBefore: service.bufferBefore,
    bufferAfter: service.bufferAfter,
    meetLinkRequired: service.meetLinkRequired,
    createdAt: (service.createdAt as Date | undefined)?.toISOString?.() ?? null,
    updatedAt: (service.updatedAt as Date | undefined)?.toISOString?.() ?? null,
  };
}

export async function GET() {
  try {
    await connectToDatabase();

    const services = await Service.find({})
      .sort({ order: 1, name: 1 })
      .lean();

    return Response.json({ services: services.map(serializeService) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load services.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { name, slug, description, pricing, packages, duration, bufferBefore, bufferAfter, order, meetLinkRequired } = body;

    if (!name || !slug || !description || !pricing?.type || pricing?.amount == null || !duration) {
      return Response.json({ error: "Missing required fields." }, { status: 400 });
    }

    const existing = await Service.findOne({ slug: slug.toLowerCase().trim() }).lean();
    if (existing) {
      return Response.json({ error: "A service with that slug already exists." }, { status: 409 });
    }

    const service = await Service.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      description: description.trim(),
      pricing,
      packages: packages ?? [],
      duration: Number(duration),
      bufferBefore: Number(bufferBefore ?? 0),
      bufferAfter: Number(bufferAfter ?? 0),
      order: Number(order ?? 0),
      meetLinkRequired: Boolean(meetLinkRequired ?? false),
    });

    return Response.json({ service: serializeService(service.toObject()) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create service.";
    return Response.json({ error: message }, { status: 500 });
  }
}