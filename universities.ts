import { University } from "./types";

/**
 * Configurable list of approved partner universities and their official email domains.
 * Additional universities can be added here without altering any authentication logic.
 */
export const APPROVED_UNIVERSITIES: University[] = [
  {
    id: "univ-jaffna",
    name: "University of Jaffna",
    emailDomains: ["univ.jfn.ac.lk", "jfn.ac.lk"],
    logo: "🎓",
    isActive: true,
    campusLocations: ["Thirunelvely", "Ariviyal Nagar (Kilinochchi)"],
  },
  {
    id: "univ-colombo",
    name: "University of Colombo",
    emailDomains: ["cmb.ac.lk", "sci.cmb.ac.lk", "ucsc.cmb.ac.lk"],
    logo: "🏛️",
    isActive: true,
    campusLocations: ["Colombo 03", "Reid Avenue"],
  },
  {
    id: "univ-moratuwa",
    name: "University of Moratuwa",
    emailDomains: ["uom.lk", "itfac.mrt.ac.lk"],
    logo: "⚙️",
    isActive: true,
    campusLocations: ["Katubedda"],
  },
  {
    id: "univ-peradeniya",
    name: "University of Peradeniya",
    emailDomains: ["pdn.ac.lk", "eng.pdn.ac.lk"],
    logo: "🌿",
    isActive: true,
    campusLocations: ["Peradeniya"],
  },
  {
    id: "univ-kelaniya",
    name: "University of Kelaniya",
    emailDomains: ["kln.ac.lk"],
    logo: "📚",
    isActive: true,
    campusLocations: ["Dalugama"],
  },
  {
    id: "demo-test-campus",
    name: "Campus Marketplace Test Campus",
    emailDomains: ["gmail.com", "campus.edu", "student.edu", "googlemail.com"],
    logo: "🌟",
    isActive: true,
    campusLocations: ["Developer Sandbox", "Demo Dorm"],
  },
];
