import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { fetchRemoteJobs, getJobCategory, getJobFingerprint } from "@/lib/job-sources";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramDigest } from "@/lib/notify";

export const runtime = "nodejs";

function formatError(error: unknown): string {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.details === "string") return obj.details;
    if (typeof obj.hint === "string") return obj.hint;
    return JSON.stringify(error);
  }
  return String(error);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service credentials not configured" }, { status: 500 });
  }

  let lockToken: string | null = null;
  let runId: string | null = null;

  try {
    // 1. Try acquire lock
    const { data: lock, error: lockError } = await supabaseAdmin.rpc("try_acquire_job_refresh_lock");
    if (!lockError && lock) {
      lockToken = String(lock);
    }

    // 2. Register run history
    const { data: run } = await supabaseAdmin
      .from("job_refresh_runs")
      .insert({ status: "running" })
      .select("id")
      .single();
    if (run?.id) runId = run.id;

    // 3. Fetch remote jobs from all active scrapers
    const jobs = await fetchRemoteJobs();

    // 4. Remove expired jobs older than 30 days
    const expiryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("jobs")
      .delete()
      .or(`published_at.lt.${expiryDate},and(published_at.is.null,created_at.lt.${expiryDate})`);

    if (!jobs.length) {
      if (runId) {
        await supabaseAdmin.from("job_refresh_runs").update({
          completed_at: new Date().toISOString(),
          status: "success",
          jobs_found: 0,
          jobs_saved: 0,
          new_jobs: 0,
        }).eq("id", runId);
      }
      return NextResponse.json({ ok: true, totalProcessed: 0, newJobs: 0, message: "No jobs returned by sources" });
    }

    // 5. Existing jobs fingerprint deduplication
    const { data: existing } = await supabaseAdmin
      .from("jobs")
      .select("id,title,company,url");

    const existingIds = new Set((existing || []).map((row) => row.id));
    const existingFingerprints = new Set(
      (existing || []).map((row) =>
        getJobFingerprint({
          title: row.title || "",
          company: row.company || "",
          url: row.url || "",
        })
      )
    );

    const uniqueJobs = jobs.filter((job) => {
      const fingerprint = getJobFingerprint(job);
      if (existingIds.has(job.id)) return true;
      if (existingFingerprints.has(fingerprint)) return false;
      existingFingerprints.add(fingerprint);
      return true;
    });

    const newJobs = uniqueJobs.filter((job) => !existingIds.has(job.id));

    // 6. Map to valid columns ONLY (no nonexistent columns!)
    const rows = uniqueJobs.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location || null,
      url: j.url,
      description: j.description || null,
      source: j.source,
      category: getJobCategory(j),
      published_at: j.publishedAt || null,
    }));

    // 7. Upsert to jobs table
    const { error: upsertError } = await supabaseAdmin
      .from("jobs")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

    if (upsertError) {
      throw upsertError;
    }

    // 8. Optional notifications digest
    try {
      const { data: pending } = await supabaseAdmin
        .from("jobs")
        .select("id,title,company,location,url,description,source,published_at")
        .in("id", uniqueJobs.map((j) => j.id))
        .is("telegram_notified_at", null)
        .is("telegram_notification_error", null);

      if (pending && pending.length > 0) {
        const jobsToNotify = pending.map((row) => ({
          id: row.id,
          title: row.title,
          company: row.company,
          location: row.location || "",
          url: row.url,
          description: row.description || "",
          source: row.source,
          publishedAt: row.published_at || undefined,
        }));
        const notification = await sendTelegramDigest(jobsToNotify);
        if (notification.sentIds.length) {
          await supabaseAdmin
            .from("jobs")
            .update({ telegram_notified_at: new Date().toISOString() })
            .in("id", notification.sentIds);
        }
      }
    } catch {
      // Silent notification errors
    }

    // 9. Update job_refresh_runs
    if (runId) {
      await supabaseAdmin.from("job_refresh_runs").update({
        completed_at: new Date().toISOString(),
        status: "success",
        jobs_found: jobs.length,
        jobs_saved: rows.length,
        new_jobs: newJobs.length,
      }).eq("id", runId);
    }

    return NextResponse.json({
      ok: true,
      totalProcessed: rows.length,
      found: jobs.length,
      newJobs: newJobs.length,
      saved: rows.length,
    });
  } catch (error) {
    const message = formatError(error);
    if (runId) {
      await supabaseAdmin.from("job_refresh_runs").update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error: message,
      }).eq("id", runId);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (lockToken) {
      await supabaseAdmin.rpc("release_job_refresh_lock", { p_token: lockToken });
    }
  }
}
