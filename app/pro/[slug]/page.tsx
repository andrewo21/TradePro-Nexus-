import { notFound } from "next/navigation";
import { ShieldCheck, MapPin, Users, Briefcase, Phone, Mail, Camera, CheckCircle, Building2, FileText, Ruler, Wrench, Shield, Landmark, Megaphone } from "lucide-react";
import AvatarImage from "@/components/AvatarImage";
import TradeCardShare from "@/components/TradeCardShare";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Profile, Company } from "@/types/database";
import FollowButton from "@/components/FollowButton";
import ProfileViewTracker from "@/components/ProfileViewTracker";
import { PROFILE_TYPES, canBeVerified } from "@/lib/constants";
import BadgeDisplay from "@/components/BadgeDisplay";
import OwnerProfileBar from "@/components/OwnerProfileBar";

function VerificationBadge({ status, profileType }: { status: string; profileType: string }) {
  // Individual trade workers are never verified — show nothing at all.
  if (!canBeVerified(profileType)) return null;

  if (status !== "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
        PENDING VERIFICATION
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3" /> VERIFIED PRO
    </span>
  );
}

// Legacy Member badge — earned by first 100 members who signup AND post.
// Gold shield design — visually distinct from all other badges.
function LegacyBadge({ legacyMember }: { legacyMember: boolean }) {
  if (!legacyMember) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-black text-[#0f172a] bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-300 px-3 py-1.5 rounded-xl shadow shadow-amber-900/50">
      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-black tracking-wide">LEGACY MEMBER</span>
        <span className="text-[9px] font-bold tracking-widest opacity-70">FIRST 100</span>
      </span>
    </span>
  );
}

// Union Member badge — self-reported only, never auto-assigned.
// Prominently styled in IBEW/union blue to signal union affiliation at a glance.
function UnionBadge({ unionMember, unionName, unionLocalNumber }: {
  unionMember: boolean;
  unionName?: string | null;
  unionLocalNumber?: string | null;
}) {
  if (!unionMember) return null;
  const local = unionLocalNumber ? `Local ${unionLocalNumber}` : null;
  const affiliation = [unionName, local].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-blue-700 border border-blue-500 px-3 py-1 rounded-full shadow-sm shadow-blue-900/40">
      <Shield className="w-3.5 h-3.5 flex-shrink-0" />
      UNION MEMBER
      {affiliation && (
        <span className="text-blue-200 font-semibold text-[11px]">{affiliation}</span>
      )}
    </span>
  );
}

export default async function TradeCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await getSupabaseServer()) as any;

  const [{ data: profile }, { data: { user } }] = await Promise.all([
    db.from("profiles").select("*").eq("slug", slug).single() as Promise<{ data: Profile | null; error: unknown }>,
    db.auth.getUser(),
  ]);

  if (!profile) notFound();

  const isOwner = !!user && user.id === profile.user_id;

  const { data: company } = profile.company_id
    ? ((await db
        .from("companies")
        .select("name, slug")
        .eq("id", profile.company_id)
        .single()) as { data: Pick<Company, "name" | "slug"> | null; error: unknown })
    : { data: null };

  const otherCerts = (profile.other_certifications ?? []).join(", ");

  // Fetch earned badges for this profile's user
  const { data: badgeRows } = profile.user_id
    ? await db.from("user_badges").select("badge_slug").eq("user_id", profile.user_id)
    : { data: [] };
  const earnedBadgeSlugs: string[] = (badgeRows ?? []).map((r: any) => r.badge_slug);

  // Type-specific fields from JSONB column
  const profileType = (profile as any).profile_type ?? "tradepro";
  const typeData = (profile as any).type_data ?? {};
  const licenseNumber = (profile as any).license_number;
  const licenseStates = (profile as any).license_states ?? [];
  const firmName = (profile as any).firm_name;

  // Legacy member
  const legacyMember = !!(profile as any).legacy_member;

  // Union fields — self-reported, optional
  const unionMember = !!(profile as any).union_member;
  const unionName = (profile as any).union_name;
  const unionLocalNumber = (profile as any).union_local_number;
  const unionMemberStatus = (profile as any).union_member_status;
  const prevailingWageCertified = !!(profile as any).prevailing_wage_certified;
  const davisBaconEligible = !!(profile as any).davis_bacon_eligible;
  const unionCardExpiration = (profile as any).union_card_expiration;
  const hasUnionDetails = unionMember && (unionName || unionLocalNumber || unionMemberStatus || prevailingWageCertified || davisBaconEligible || unionCardExpiration);
  const typeConfig = PROFILE_TYPES[profileType as keyof typeof PROFILE_TYPES] ?? PROFILE_TYPES.tradepro;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      {/* Records GC profile view client-side for push notification trigger */}
      <ProfileViewTracker profileId={profile.id} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {isOwner && user && (
          <OwnerProfileBar
            profileId={profile.id}
            userId={user.id}
            initials={`${profile.first_name[0]}${profile.last_name[0]}`}
            initialAvatarUrl={(profile as any).avatar_url ?? null}
            initialBio={(profile as any).bio ?? ""}
            initialPhone={(profile as any).phone ?? ""}
            initialEmail={(profile as any).email ?? ""}
            initialCity={profile.location_city ?? ""}
            initialState={profile.location_state ?? ""}
            initialTrade={profile.trade ?? ""}
            initialYears={(profile as any).years_experience ?? 0}
          />
        )}

        {/* Trade Card sponsor banner -- full width, 90px, below header */}
        <a
          href="/advertise"
          className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-3 mb-4 hover:border-orange-500/50 transition-colors group"
          style={{ minHeight: "90px" }}
          aria-label="Advertise on TradePro Nexus"
        >
          <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Sponsored</p>
            <p className="text-white font-black text-sm group-hover:text-orange-400 transition-colors">
              Reach 828,486 Licensed Contractors
            </p>
            <p className="text-slate-400 text-xs">
              Founding sponsor slots available. Reserve your placement today.
            </p>
          </div>
          <span className="flex-shrink-0 px-4 py-2 bg-orange-600 group-hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap hidden sm:inline-flex">
            Reserve a Slot
          </span>
        </a>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/60 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4">
            <AvatarImage
              avatarUrl={(profile as any).avatar_url}
              initials={`${profile.first_name[0]}${profile.last_name[0]}`}
              size="xl"
              className="border-2 border-orange-600/40"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2 flex-wrap">
                    {profile.first_name} {profile.last_name}
                    <LegacyBadge legacyMember={legacyMember} />
                    <UnionBadge
                      unionMember={unionMember}
                      unionName={unionName}
                      unionLocalNumber={unionLocalNumber}
                    />
                  </h1>
                  <p className="text-orange-400 font-semibold">{profile.trade}</p>
                </div>
                <VerificationBadge status={profile.verification_status ?? "pending"} profileType={profileType} />
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                {(profile.location_city || profile.location_state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[profile.location_city, profile.location_state].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profile.years_experience} yrs exp</span>
                {profile.crew_size && <span className="flex items-center gap-1"><Users className="w-3 h-3" />Crew of {profile.crew_size}</span>}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  profile.availability_status === "available"
                    ? "text-green-400 bg-green-900/30 border-green-800/50"
                    : profile.availability_status === "available_soon"
                    ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
                    : "text-red-400 bg-red-900/30 border-red-800/50"
                }`}>
                  {profile.availability_status === "available"
                    ? "Available Now"
                    : profile.availability_status === "available_soon"
                    ? profile.available_in_weeks ? `Available in ${profile.available_in_weeks} wks` : "Available Soon"
                    : "Booked"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  profile.payroll_type === "direct"
                    ? "text-green-400 bg-green-900/30 border-green-800/50"
                    : profile.payroll_type === "mixed"
                    ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
                    : "text-slate-400 bg-slate-800 border-slate-700"
                }`}>
                  {profile.payroll_type === "direct" ? "Direct Payroll" : profile.payroll_type === "mixed" ? "Mixed Payroll" : "1099"}
                </span>
                {profile.is_lead_foreman && (
                  <span className="text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-800/50 px-2 py-1 rounded-full">
                    Lead Foreman
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile type badge + firm name */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
              {typeConfig.label}
            </span>
            {firmName && <span className="text-xs text-slate-400">{firmName}</span>}
          </div>

          {/* Community badges */}
          {earnedBadgeSlugs.length > 0 && (
            <div className="mt-3">
              <BadgeDisplay badgeSlugs={earnedBadgeSlugs} size="md" />
            </div>
          )}

          {/* License number — prominent for inspectors/architects/engineers */}
          {licenseNumber && (
            <div className="mt-3 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">License</p>
                <p className="text-sm font-bold text-white font-mono">{licenseNumber}</p>
                {licenseStates.length > 0 && <p className="text-xs text-slate-400">{licenseStates.join(", ")}</p>}
              </div>
            </div>
          )}

          {/* Union details — shown only when self-reported and filled in */}
          {hasUnionDetails && (
            <div className="mt-3 bg-blue-950/30 border border-blue-800/50 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" /> Union Information
              </p>
              <div className="flex flex-wrap gap-2">
                {(unionName || unionLocalNumber) && (
                  <span className="text-xs font-bold text-white bg-blue-800/60 border border-blue-700/60 px-2.5 py-1 rounded-full">
                    {[unionName, unionLocalNumber ? `Local ${unionLocalNumber}` : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                {unionMemberStatus && (
                  <span className="text-xs font-semibold text-blue-200 bg-blue-900/40 border border-blue-700/40 px-2.5 py-1 rounded-full">
                    {unionMemberStatus}
                  </span>
                )}
                {prevailingWageCertified && (
                  <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2.5 py-1 rounded-full">
                    Prevailing Wage Certified
                  </span>
                )}
                {davisBaconEligible && (
                  <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2.5 py-1 rounded-full">
                    Davis-Bacon Eligible
                  </span>
                )}
                {unionCardExpiration && (
                  <span className="text-xs font-semibold text-blue-300 bg-blue-900/30 border border-blue-700/40 px-2.5 py-1 rounded-full">
                    Card Exp. {new Date(unionCardExpiration).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Share + Follow row */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
            {/* Share buttons — always visible */}
            <TradeCardShare
              slug={profile.slug}
              firstName={profile.first_name}
              lastName={profile.last_name}
              firmName={firmName}
              trade={profile.trade ?? undefined}
              yearsExperience={profile.years_experience ?? undefined}
              locationCity={profile.location_city ?? undefined}
              locationState={profile.location_state ?? undefined}
              availabilityStatus={profile.availability_status ?? undefined}
              avatarUrl={(profile as any).avatar_url ?? undefined}
              unionMember={unionMember}
              unionName={unionName ?? undefined}
              unionLocalNumber={unionLocalNumber ?? undefined}
              certifications={(profile as any).other_certifications ?? []}
              legacyMember={legacyMember}
              earnedBadgeSlugs={earnedBadgeSlugs}
            />
            <div className="flex items-center gap-3">
              <FollowButton followingId={profile.id} followingType="profile" label={`Follow ${profile.first_name}`} />
            </div>
          </div>

          {profile.bio && (
            <p className="text-slate-300 text-sm mt-4 leading-relaxed border-t border-slate-700/50 pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Company Link */}
        {company && (
          <Link href={`/company/${company.slug}`} className="card-hover block bg-slate-800/50 border border-slate-700/50 hover:border-blue-700/60 rounded-xl p-4 mb-4 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Company</p>
                  <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{company.name}</p>
                </div>
              </div>
              <span className="text-xs text-blue-400 font-semibold group-hover:underline">View Profile →</span>
            </div>
          </Link>
        )}

        {/* Certifications */}
        {((profile.osha_certifications?.length ?? 0) > 0 || otherCerts) && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-orange-400" /> Certifications &amp; Credentials
            </h2>
            <div className="space-y-2">
              {(profile.osha_certifications ?? []).map((cert) => (
                <div key={cert} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {cert}
                </div>
              ))}
              {otherCerts && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {otherCerts}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inspector-specific: inspection types and jurisdictions */}
        {profileType === "inspector" && (typeData.inspection_types?.length > 0 || typeData.jurisdictions) && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-green-400" /> Inspection Services
            </h2>
            {typeData.inspection_types?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {typeData.inspection_types.map((t: string) => (
                  <span key={t} className="px-2.5 py-1 bg-green-900/30 border border-green-800/40 text-green-300 text-xs font-semibold rounded-full">{t}</span>
                ))}
              </div>
            )}
            {typeData.jurisdictions && (
              <p className="text-sm text-slate-300"><span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Jurisdictions: </span>{typeData.jurisdictions}</p>
            )}
          </div>
        )}

        {/* Architect-specific: specializations and software */}
        {profileType === "architect" && (typeData.specializations?.length > 0 || typeData.software?.length > 0) && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-blue-400" /> Practice Areas &amp; Software
            </h2>
            {typeData.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {typeData.specializations.map((s: string) => (
                  <span key={s} className="px-2.5 py-1 bg-blue-900/30 border border-blue-800/40 text-blue-300 text-xs font-semibold rounded-full">{s}</span>
                ))}
              </div>
            )}
            {typeData.software?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {typeData.software.map((sw: string) => (
                  <span key={sw} className="px-2.5 py-1 bg-slate-900/60 border border-slate-700/50 text-slate-400 text-xs font-semibold rounded-full">{sw}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Engineer-specific: discipline, license, software */}
        {profileType === "engineer" && (typeData.discipline || typeData.software?.length > 0) && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-purple-400" /> Engineering Discipline &amp; Software
            </h2>
            {typeData.discipline && (
              <p className="text-sm font-bold text-white mb-2">{typeData.discipline} Engineer</p>
            )}
            {typeData.pe_license_number && (
              <p className="text-xs text-slate-400 mb-3">PE License: <span className="text-slate-300 font-mono">{typeData.pe_license_number}</span></p>
            )}
            {typeData.software?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {typeData.software.map((sw: string) => (
                  <span key={sw} className="px-2.5 py-1 bg-slate-900/60 border border-slate-700/50 text-slate-400 text-xs font-semibold rounded-full">{sw}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Work Gallery */}
        {(profile.gallery_urls?.length ?? 0) > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-orange-400" /> Work Notoriety Gallery
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(profile.gallery_urls ?? []).map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-900/60 border border-slate-700/50">
                  <img src={url} alt="Work photo" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(profile.phone || profile.email) && (
          <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-900/40 rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Contact This Pro</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  <Phone className="w-4 h-4" /> {profile.phone}
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  <Mail className="w-4 h-4" /> Email
                </a>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-8">
          <Link href="/" className="hover:text-slate-400 transition-colors">TradePro Nexus</Link>
          {" "}· A TradePro Technologies LLC product ·{" "}
          <Link href="/build" className="hover:text-slate-400 transition-colors">Build Your Trade Card</Link>
        </p>
      </div>
    </div>
  );
}
