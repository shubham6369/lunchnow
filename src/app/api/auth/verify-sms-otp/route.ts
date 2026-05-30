import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP code are required" },
        { status: 400 }
      );
    }

    // Clean phone number: extract last 10 digits
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }
    const cleanedPhone = digitsOnly.slice(-10);
    const formattedPhone = `+91${cleanedPhone}`;

    // 1. Fetch OTP record from Firestore
    const otpDocRef = adminDb.collection("otps").doc(cleanedPhone);
    const otpSnap = await otpDocRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json(
        { error: "No OTP request found for this phone number. Please request a new one." },
        { status: 400 }
      );
    }

    const data = otpSnap.data();
    if (!data) {
      return NextResponse.json(
        { error: "Invalid OTP session state." },
        { status: 400 }
      );
    }

    // 2. Validate OTP value
    if (data.otp !== otp.trim()) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // 3. Validate expiration
    const expiryTime = data.expiresAt.toDate().getTime();
    if (Date.now() > expiryTime) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 4. Verification successful: Delete OTP document to prevent replay attacks
    await otpDocRef.delete();

    // 5. Retrieve or Create User in Firebase Auth using Admin SDK
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByPhoneNumber(formattedPhone);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        // User does not exist, create new one
        userRecord = await adminAuth.createUser({
          phoneNumber: formattedPhone,
        });
      } else {
        console.error("Firebase Admin getUser error:", err);
        throw err;
      }
    }

    // 6. Generate Custom Token for client authentication
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({
      success: true,
      customToken,
    });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
