import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Map username to email if necessary
    const email = username.includes("@") ? username : `${username}@trinetra.com`;

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, username")
          .eq("id", data.user.id)
          .maybeSingle();

        return NextResponse.json({
          token: data.session.access_token,
          user: {
            id: data.user.id,
            username: profile?.username || username,
            role: profile?.role || "client_admin",
          },
        });
      }
    } catch (e) {
      console.warn("Supabase Auth sign-in failed:", e);
    }

    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
