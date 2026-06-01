import { NextResponse } from "next/server";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";

type SeedSummary = {
  adminEmail: string;
  servicesCount: number;
  availabilityCount: number;
};

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return "";
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

async function runAllSeeds(): Promise<SeedSummary> {
  const adminPassword = process.env.ADMIN_USER_PW?.trim();

  if (!adminPassword) {
    throw new Error("Missing ADMIN_USER_PW environment variable.");
  }

  const [{ connectToDatabase }, { serviceSeedData }, { availabilitySeedData }, { User }, { Service }, { Availability }] = await Promise.all([
    import("@/lib/mongodb"),
    import("@/lib/seeds/services"),
    import("@/lib/seeds/availability"),
    import("@/models/User"),
    import("@/models/Service"),
    import("@/models/Availability"),
  ]);

  await connectToDatabase();

  const adminUser = await User.findOneAndUpdate(
    { email: DEFAULT_ADMIN_EMAIL },
    {
      $set: {
        name: DEFAULT_ADMIN_NAME,
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: hashPassword(adminPassword),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  ).lean();

  const serviceOperations = serviceSeedData.map((service) => ({
    updateOne: {
      filter: { slug: service.slug },
      update: {
        $set: service,
      },
      upsert: true,
    },
  }));

  if (serviceOperations.length > 0) {
    await Service.bulkWrite(serviceOperations);
  }

  const servicesCount = await Service.countDocuments({
    slug: { $in: serviceSeedData.map((service) => service.slug) },
  });

  await Availability.deleteMany({});

  if (availabilitySeedData.length > 0) {
    await Availability.insertMany(availabilitySeedData);
  }

  const availabilityCount = await Availability.countDocuments({});

  return {
    adminEmail: adminUser.email,
    servicesCount,
    availabilityCount,
  };
}

export async function POST(request: Request) {
  if (process.env.SEED_ROUTE_ENABLED !== "true") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const requestToken =
    getBearerToken(request.headers.get("authorization")) ||
    request.headers.get("x-seed-token")?.trim() ||
    "";
  const expectedToken = process.env.SEED_ROUTE_TOKEN?.trim() || "";

  if (!expectedToken) {
    return NextResponse.json(
      { message: "SEED_ROUTE_TOKEN is not configured." },
      { status: 500 }
    );
  }

  if (!requestToken || requestToken !== expectedToken) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const summary = await runAllSeeds();

    return NextResponse.json({
      message: "Seeds executed successfully.",
      summary,
    });
  } catch (error: unknown) {
    console.error("Failed to execute seed route.", error);
    return NextResponse.json(
      { message: "Failed to execute seeds." },
      { status: 500 }
    );
  }
}