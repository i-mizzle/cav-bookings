import { connectToDatabase } from "@/lib/mongodb";
import { Service } from "@/models/Service";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return Response.json({ error: "Invalid service ID." }, { status: 400 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { name, slug, description, pricing, packages, duration, bufferBefore, bufferAfter, order, meetLinkRequired } = body;

    if (!name || !slug || !description || !pricing?.type || pricing?.amount == null || !duration) {
      return Response.json({ error: "Missing required fields." }, { status: 400 });
    }

    const slugConflict = await Service.findOne({
      slug: slug.toLowerCase().trim(),
      _id: { $ne: id },
    }).lean();

    if (slugConflict) {
      return Response.json({ error: "Another service with that slug already exists." }, { status: 409 });
    }

    const updated = await Service.findByIdAndUpdate(
      id,
      {
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
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return Response.json({ error: "Service not found." }, { status: 404 });
    }

    return Response.json({
      service: {
        id: String(updated._id),
        order: updated.order,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        pricing: updated.pricing,
        packages: updated.packages,
        duration: updated.duration,
        bufferBefore: updated.bufferBefore,
        bufferAfter: updated.bufferAfter,
        meetLinkRequired: updated.meetLinkRequired,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update service.";
    return Response.json({ error: message }, { status: 500 });
  }
}
