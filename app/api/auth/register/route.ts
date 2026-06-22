import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.users.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    const referralCode = "JNA" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const user = await prisma.users.create({
      data: {
        id,
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        updatedAt: new Date(),
        referralCode,
        user_credits: {
          create: {
            id: crypto.randomUUID(),
            balance: 70,
            updatedAt: new Date(),
          }
        },
        credit_transactions: {
          create: {
            id: crypto.randomUUID(),
            type: "bonus",
            amount: 70,
            balance: 70,
            description: "Free signup bonus",
          }
        }
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
