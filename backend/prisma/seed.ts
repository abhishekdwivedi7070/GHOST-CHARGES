import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rules: { keyword: string; category: string }[] = [
  { keyword: "NETFLIX", category: "Streaming" },
  { keyword: "SPOTIFY", category: "Streaming" },
  { keyword: "HULU", category: "Streaming" },
  { keyword: "DISNEY", category: "Streaming" },
  { keyword: "HBO", category: "Streaming" },
  { keyword: "YOUTUBE", category: "Streaming" },
  { keyword: "APPLE.COM/BILL", category: "Software" },
  { keyword: "APPLE", category: "Software" },
  { keyword: "ADOBE", category: "Software" },
  { keyword: "MICROSOFT", category: "Software" },
  { keyword: "GOOGLE", category: "Software" },
  { keyword: "DROPBOX", category: "Software" },
  { keyword: "GITHUB", category: "Software" },
  { keyword: "SLACK", category: "Software" },
  { keyword: "ZOOM", category: "Software" },
  { keyword: "OPENAI", category: "Software" },
  { keyword: "ANTHROPIC", category: "Software" },
  { keyword: "PLANET FITNESS", category: "Fitness" },
  { keyword: "LA FITNESS", category: "Fitness" },
  { keyword: "PELOTON", category: "Fitness" },
  { keyword: "EQUINOX", category: "Fitness" },
  { keyword: "AMAZON", category: "Shopping" },
  { keyword: "AMZN", category: "Shopping" },
  { keyword: "UBER", category: "Transport" },
  { keyword: "LYFT", category: "Transport" },
  { keyword: "STARBUCKS", category: "Food" },
  { keyword: "DOORDASH", category: "Food" },
  { keyword: "COMCAST", category: "Utilities" },
  { keyword: "VERIZON", category: "Utilities" },
  { keyword: "AT&T", category: "Utilities" },
];

async function main() {
  await prisma.categoryRule.deleteMany();
  await prisma.categoryRule.createMany({ data: rules });
  console.log(`Seeded ${rules.length} category rules.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
