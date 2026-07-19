import { PageHeader } from '@/components/page-header'
import {
  AddCertificationForm,
  AddEducationForm,
  AddExperienceForm,
  AddSkillForm,
  BasicsForm,
  DeleteButton,
} from '@/components/profile-forms'
import { getFullProfile, NotConfiguredError } from '@/lib/db/profile'
import type { Profile } from '@/lib/types'

/**
 * The career knowledge base editor.
 *
 * This is the one page that writes real data. Everything else in the product reads
 * from what's entered here, which is why the empty states explain *why* an entry
 * matters rather than just noting that the list is empty.
 */
export default async function ProfilePage() {
  let profile: Profile | null = null
  let error: string | null = null

  try {
    profile = await getFullProfile()
  } catch (err) {
    error =
      err instanceof NotConfiguredError
        ? 'Connect Supabase to start building your profile. Until then the app runs on sample data.'
        : err instanceof Error
          ? err.message
          : 'Could not load your profile.'
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="Your profile" sub="The single source everything else reads from" />
        <div className="p-6">
          <p className="rounded-2xl border border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.1)] px-4 py-3.5 text-[13px] text-[#f5a623]">
            {error}
          </p>
        </div>
      </>
    )
  }

  const entryCount =
    profile.experiences.length +
    profile.skills.length +
    profile.education.length +
    profile.certifications.length

  return (
    <>
      <PageHeader
        title="Your profile"
        sub="The single source every score and CV is built from"
      />

      <div className="animate-fade-up flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        {entryCount === 0 && (
          <p className="rounded-2xl border border-[rgba(79,209,197,0.28)] bg-[rgba(79,209,197,0.1)] px-4 py-3.5 text-[13px] leading-[1.6] text-[#c3cbdc]">
            Your profile is empty. Add a role or two with real achievements — every line SkillNorth
            writes on a tailored CV must cite something here, so this is where the quality comes
            from.
          </p>
        )}

        <section className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
            Your details
          </h2>
          <p className="mt-1 mb-4 text-[11.5px] text-[#7c88a3]">
            These appear at the top of every CV you generate.
          </p>
          <BasicsForm
            defaults={{
              fullName: profile.fullName,
              headline: profile.headline,
              location: profile.location,
              phone: profile.phone,
              summary: profile.summary,
            }}
          />
        </section>

        {/* Experience */}
        <section className="panel p-5">
          <SectionHead
            title="Experience"
            count={profile.experiences.length}
            hint="Roles and what you actually achieved in them."
          />
          {profile.experiences.length === 0 ? (
            <Empty text="No roles yet. This is the most important section — add one." />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {profile.experiences.map((exp) => (
                <li
                  key={exp.id}
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold">{exp.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#7c88a3]">
                        {exp.company}
                        {exp.location ? ` · ${exp.location}` : ''} · {exp.startDate || '—'} to{' '}
                        {exp.isCurrent ? 'present' : exp.endDate || '—'}
                      </p>
                    </div>
                    <DeleteButton table="experiences" id={exp.id} label={exp.title} />
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {exp.bullets.map((b) => (
                        <li
                          key={b.id}
                          className="flex gap-2 text-[12px] leading-[1.6] text-[#c3cbdc]"
                        >
                          <span className="text-[#4fd1c5]">·</span>
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <AddExperienceForm />
        </section>

        {/* Skills */}
        <section className="panel p-5">
          <SectionHead
            title="Skills"
            count={profile.skills.length}
            hint="Matched against every posting you add."
          />
          {profile.skills.length === 0 ? (
            <Empty text="No skills yet. These drive the biggest part of your match score." />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] py-1 pr-1 pl-3.5"
                >
                  <span className="text-[12.5px]">{skill.name}</span>
                  {skill.level && (
                    <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-[#7c88a3] uppercase">
                      {skill.level}
                    </span>
                  )}
                  <DeleteButton table="skills" id={skill.id} label={skill.name} />
                </li>
              ))}
            </ul>
          )}
          <AddSkillForm />
        </section>

        {/* Certifications */}
        <section className="panel p-5">
          <SectionHead
            title="Certifications"
            count={profile.certifications.length}
            hint="Counted directly in the qualifications dimension."
          />
          {profile.certifications.length === 0 ? (
            <Empty text="No certifications yet." />
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.certifications.map((cert) => (
                <li
                  key={cert.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold">{cert.name}</p>
                    <p className="text-[11px] text-[#7c88a3]">
                      {cert.issuer}
                      {cert.issued ? ` · ${cert.issued}` : ''}
                    </p>
                  </div>
                  <DeleteButton table="certifications" id={cert.id} label={cert.name} />
                </li>
              ))}
            </ul>
          )}
          <AddCertificationForm />
        </section>

        {/* Education */}
        <section className="panel p-5">
          <SectionHead
            title="Education"
            count={profile.education.length}
            hint="Checked against a posting's stated requirements."
          />
          {profile.education.length === 0 ? (
            <Empty text="No qualifications yet." />
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.education.map((edu) => (
                <li
                  key={edu.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold">
                      {edu.qualification}
                      {edu.field ? `, ${edu.field}` : ''}
                    </p>
                    <p className="text-[11px] text-[#7c88a3]">
                      {edu.institution}
                      {edu.endDate ? ` · ${edu.endDate}` : ''}
                    </p>
                  </div>
                  <DeleteButton table="education" id={edu.id} label={edu.qualification} />
                </li>
              ))}
            </ul>
          )}
          <AddEducationForm />
        </section>
      </div>
    </>
  )
}

function SectionHead({ title, count, hint }: { title: string; count: number; hint: string }) {
  return (
    <div className="mb-3.5">
      <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[15px] font-semibold">
        {title}
        <span className="tnum font-[family-name:var(--font-mono)] text-[11px] text-[#7c88a3]">
          {count}
        </span>
      </h2>
      <p className="mt-0.5 text-[11.5px] text-[#7c88a3]">{hint}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-[10px] border border-dashed border-[rgba(255,255,255,0.12)] px-3.5 py-4 text-[12px] text-[#7c88a3]">
      {text}
    </p>
  )
}
