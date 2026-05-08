import { loadEnvConfig } from "@next/env";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";

loadEnvConfig(process.cwd());

async function seedAdminUser() {
  const adminPassword = process.env.ADMIN_USER_PW?.trim();

  if (!adminPassword) {
    throw new Error("Missing ADMIN_USER_PW environment variable.");
  }

  const [{ connectToDatabase }, { User }] = await Promise.all([
    import("@/lib/mongodb"),
    import("@/models/User"),
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

  console.log(`Seeded admin user ${adminUser.email}.`);
}

seedAdminUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Failed to seed admin user.", error);
    process.exit(1);
  });