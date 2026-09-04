import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { fetchRemoteJobs, getJobCategory, getJobFingerprint } from "@/lib/job-sources";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role credentials not configured" }, { status: 500 });
  }

  try {
    const jobs = await fetchRemoteJobs();
    if (!jobs.length) {
      return NextResponse.json({ ok: true, inserted: 0, message: "No jobs returned by sources" });
    }

    const payload = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      description: job.description,
      source: job.source,
      published_at: job.publishedAt,
      category: getJobCategory(job),
      fingerprint: getJobFingerprint(job),
    }));

    const { error: upsertError } = await supabaseAdmin.from("jobs").upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (upsertError) throw upsertError;

    return NextResponse.json({ ok: true, totalProcessed: jobs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute manual refresh";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
