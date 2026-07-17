/**
 * Test fixtures: real-shaped profiles and postings.
 *
 * These let the whole scoring path be tested end to end without an LLM call, which
 * is what makes the match engine cheap to iterate on and safe to refactor.
 */

import type { Job, Profile } from '@/lib/types'

export const priya: Profile = {
  id: 'prof_priya',
  fullName: 'Priya Nathan',
  headline: 'Analytics Engineer',
  email: 'priya@example.com',
  location: 'Auckland, New Zealand',
  links: { linkedin: 'https://linkedin.com/in/example' },
  summary: 'Analytics engineer with six years building data platforms for retail and logistics.',
  version: 1,
  experiences: [
    {
      id: 'exp_1',
      company: 'Snowbird Data',
      title: 'Analytics Engineer',
      location: 'Auckland',
      startDate: '2022-03',
      endDate: null,
      isCurrent: true,
      bullets: [
        {
          id: 'bul_1',
          text: 'Rebuilt the core reporting pipeline in dbt and Airflow, cutting nightly runtime by 40%.',
        },
        {
          id: 'bul_2',
          text: 'Led migration of 3 legacy SQL Server marts onto Snowflake with zero reporting downtime.',
        },
        {
          id: 'bul_3',
          text: 'Introduced CI/CD for analytics code, taking deploys from fortnightly to daily.',
        },
      ],
    },
    {
      id: 'exp_2',
      company: 'Fernbrook Group',
      title: 'BI Analyst',
      location: 'Auckland',
      startDate: '2019-01',
      endDate: '2022-02',
      isCurrent: false,
      bullets: [
        {
          id: 'bul_4',
          text: 'Built and maintained Power BI reporting used by 200 staff across 4 business units.',
        },
        {
          id: 'bul_5',
          text: 'Automated month-end reconciliation in Python, saving roughly 20 hours per month.',
        },
      ],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'University of Auckland',
      qualification: 'Bachelor of Science',
      field: 'Statistics',
      startDate: '2015-02',
      endDate: '2018-11',
    },
  ],
  certifications: [
    {
      id: 'cert_1',
      name: 'dbt Analytics Engineering Certification',
      issuer: 'dbt Labs',
      issued: '2023-06',
    },
  ],
  skills: [
    { id: 'sk_1', name: 'SQL', category: 'technical', level: 'expert', years: 6, source: 'parsed' },
    { id: 'sk_2', name: 'Python', category: 'technical', level: 'advanced', years: 5, source: 'parsed' },
    { id: 'sk_3', name: 'dbt', category: 'tool', level: 'advanced', years: 3, source: 'parsed' },
    { id: 'sk_4', name: 'Airflow', category: 'tool', level: 'advanced', years: 3, source: 'parsed' },
    { id: 'sk_5', name: 'Power BI', category: 'tool', level: 'advanced', years: 4, source: 'parsed' },
    { id: 'sk_6', name: 'Snowflake', category: 'tool', level: 'intermediate', years: 2, source: 'parsed' },
  ],
  projects: [],
}

/** A strong match: Priya has nearly everything this asks for. */
export const snowbirdJob: Job = {
  id: 'job_snowbird',
  url: 'https://example.com/jobs/senior-analytics-engineer',
  source: 'pasted',
  title: 'Senior Analytics Engineer',
  company: 'Snowbird Data',
  location: 'Auckland, New Zealand',
  rawText: 'Senior Analytics Engineer at Snowbird Data...',
  requirements: [
    { id: 'req_1', name: 'SQL', kind: 'must_have', category: 'technical' },
    { id: 'req_2', name: 'Python', kind: 'must_have', category: 'technical' },
    { id: 'req_3', name: 'dbt', kind: 'must_have', category: 'tool' },
    { id: 'req_4', name: 'Snowflake', kind: 'must_have', category: 'tool' },
    { id: 'req_5', name: 'Airflow', kind: 'nice_to_have', category: 'tool' },
    { id: 'req_6', name: 'CI/CD', kind: 'nice_to_have', category: 'tool' },
  ],
  responsibilities: [
    'Own the analytics data pipeline end to end',
    'Partner with stakeholders to define metrics',
  ],
  seniority: 'senior',
  educationRequirements: [],
  logistics: { remote: 'remote', location: 'Auckland, New Zealand' },
  minYearsExperience: 5,
}

/** A weaker match: Terraform and Kubernetes are genuine gaps. */
export const orbitalJob: Job = {
  id: 'job_orbital',
  source: 'pasted',
  title: 'Data Platform Lead',
  company: 'Orbital Labs',
  location: 'Wellington, New Zealand',
  rawText: 'Data Platform Lead at Orbital Labs...',
  requirements: [
    { id: 'oreq_1', name: 'SQL', kind: 'must_have', category: 'technical' },
    { id: 'oreq_2', name: 'Terraform', kind: 'must_have', category: 'tool' },
    { id: 'oreq_3', name: 'Kubernetes', kind: 'must_have', category: 'tool', aliases: ['k8s'] },
    { id: 'oreq_4', name: 'Snowflake', kind: 'nice_to_have', category: 'tool' },
    { id: 'oreq_5', name: 'Stakeholder management', kind: 'nice_to_have', category: 'soft' },
  ],
  responsibilities: ['Lead a team of four engineers', 'Own platform reliability'],
  seniority: 'lead',
  educationRequirements: ["Bachelor's degree in a numerate discipline"],
  logistics: { remote: 'onsite', location: 'Wellington, New Zealand' },
  minYearsExperience: 8,
}
