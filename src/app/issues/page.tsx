import { redirect } from "next/navigation";

/** The /issues archive route was retired — there is no real back-catalogue
 *  to display, so this URL now redirects callers to the homepage. */
export default function IssuesPage(): never {
  redirect("/");
}
