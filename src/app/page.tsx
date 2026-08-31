import { redirect } from "next/navigation";

export default function Home() {
  // TODO: replace this 307 with an internal rewrite in next.config.ts (source "/" -> destination
  // "/dashboard"). Rewrites are served internally, so the root would emit no 3xx at all. Deferred
  // because it needs the dashboard moved out of the (app) route group layout or duplicated.
  redirect("/dashboard");
}
