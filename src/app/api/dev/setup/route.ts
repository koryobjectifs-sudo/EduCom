import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { action, role, simulatedDate, simulatedPeriod } = await req.json();

  const cookieStore = await cookies();

  if (action === "reset") {
    // Supprimer uniquement les données de test (namespace "TEST_SCHOOL_DEV")
    const testSchool = await prisma.school.findFirst({ where: { name: "TEST_SCHOOL_DEV" } });
    if (testSchool) {
      await prisma.school.delete({ where: { id: testSchool.id } }); // Cascade handles the rest
    }
    cookieStore.delete("dev_test_school_id");
    cookieStore.delete("dev_test_user_id");
    cookieStore.delete("dev_test_date");
    cookieStore.delete("dev_test_period");
    return NextResponse.json({ success: true });
  }

  if (action === "setup") {
    // Clean up previous if any
    const existingTestSchool = await prisma.school.findFirst({ where: { name: "TEST_SCHOOL_DEV" } });
    if (existingTestSchool) {
      await prisma.school.delete({ where: { id: existingTestSchool.id } });
    }

    const testSchool = await prisma.school.create({
      data: {
        name: "TEST_SCHOOL_DEV",
        primaryColor: "#0B1F3A",
        onboardingCompleted: true, // We can bypass wizard or test it explicitly
      }
    });

    const testUser = await prisma.user.create({
      data: {
        id: "test-user-id-" + Math.random().toString(36).substr(2, 9),
        email: "test@educom.dev",
        firstName: "Dev",
        lastName: "Tester",
        role: role || "OWNER",
        schoolId: testSchool.id,
      }
    });

    cookieStore.set("dev_test_school_id", testSchool.id, { path: "/" });
    cookieStore.set("dev_test_user_id", testUser.id, { path: "/" });
    
    if (simulatedDate) {
      cookieStore.set("dev_test_date", simulatedDate, { path: "/" });
    } else {
      cookieStore.delete("dev_test_date");
    }

    if (simulatedPeriod) {
      cookieStore.set("dev_test_period", simulatedPeriod, { path: "/" });
    } else {
      cookieStore.delete("dev_test_period");
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
