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

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Retrieve the user profile role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, username")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      // If profile doesn't exist, this might be a newly created Auth user without a profile.
      // For fallback/super_admin bootstrapping, we can assign a default role.
      return NextResponse.json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          username: username,
          role: "client_admin",
        },
      });
    }

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        username: profile.username,
        role: profile.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
