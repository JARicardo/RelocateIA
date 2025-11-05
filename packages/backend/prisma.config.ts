import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";
import path, { join } from "path";

dotenv.config({ path: join(__dirname, ".env") });

export default defineConfig({
  schema: path.join("prisma",),
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
