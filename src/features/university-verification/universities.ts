import { University } from "./types";

/**
 * University of Jaffna configuration.
 * Campus Marketplace is exclusively restricted to students and staff of University of Jaffna.
 * Supported domains: @univ.jfn.ac.lk, @jfn.ac.lk, @student.jfn.ac.lk
 */
export const JAFFNA_UNIVERSITY: University = {
  id: "univ-jaffna",
  name: "University of Jaffna",
  emailDomains: ["univ.jfn.ac.lk", "jfn.ac.lk", "student.jfn.ac.lk"],
  logo: "🎓",
  isActive: true,
  campusLocations: ["Thirunelvely", "Ariviyal Nagar (Kilinochchi)"],
};

export const APPROVED_UNIVERSITIES: University[] = [JAFFNA_UNIVERSITY];
