import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Clean phone number: remove all non-digits
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    
    // Extract last 10 digits for Indian standard numbers (Fast2SMS expects 10-digit numbers)
    if (digitsOnly.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number" },
        { status: 400 }
      );
    }
    const cleanedPhone = digitsOnly.slice(-10);

    // 1. Rate Limiting Check (Max 1 request per 60 seconds)
    const otpDocRef = adminDb.collection("otps").doc(cleanedPhone);
    const existingDoc = await otpDocRef.get();

    if (existingDoc.exists) {
      const data = existingDoc.data();
      if (data && data.createdAt) {
        const lastSent = data.createdAt.toDate().getTime();
        const now = Date.now();
        const diffSeconds = (now - lastSent) / 1000;

        if (diffSeconds < 60) {
          const waitTime = Math.ceil(60 - diffSeconds);
          return NextResponse.json(
            { error: `Please wait ${waitTime} seconds before requesting another OTP.` },
            { status: 429 }
          );
        }
      }
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // 3. Save OTP in Firestore
    await otpDocRef.set({
      otp,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 4. Send SMS via Fast2SMS
    const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
    const isDev = process.env.NODE_ENV === "development";

    if (!fast2smsApiKey || fast2smsApiKey === "placeholder") {
      if (isDev) {
        // Development Fallback: If no API key is configured, log to console
        console.log(`\n--- [DEVELOPMENT OTP BYPASS] ---`);
        console.log(`Phone: +91${cleanedPhone}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`---------------------------------\n`);

        return NextResponse.json({
          success: true,
          message: "[DEV MODE] OTP generated and logged to server console.",
          devMode: true,
          otpCode: otp, // Send OTP to client ONLY during development if API key isn't set up
        });
      } else {
        // Production: Fail securely if API key is missing
        console.error("FAST2SMS_API_KEY is not configured in the production environment.");
        return NextResponse.json(
          { error: "SMS service is currently unavailable. Please try again later." },
          { status: 500 }
        );
      }
    }

    // Real SMS delivery
    // Fast2SMS URL format: https://www.fast2sms.com/dev/bulkV2?authorization=KEY&variables_values=OTP&route=otp&numbers=10DIGITS
    const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
      fast2smsApiKey
    )}&variables_values=${otp}&route=otp&numbers=${cleanedPhone}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "cache-control": "no-cache",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.return) {
      console.error("Fast2SMS API error:", result);
      return NextResponse.json(
        { error: result.message || "Failed to deliver OTP SMS via provider." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully via SMS.",
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
