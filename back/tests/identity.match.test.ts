import { describe, expect, it } from 'vitest';
import { clusterSourceProfiles, profilesShareIdentity } from '@back/pipeline/identity/match';
import { makeSourceProfile } from './fixtures/source_profile';

describe('identity matching', () => {
  it('clusters profiles that share an email', () => {
    const profiles = [
      makeSourceProfile('csv', { full_name: 'Arjun Sharma', emails: ['arjun.sharma@gmail.com'] }, 'row-0'),
      makeSourceProfile('ats_json', { emails: ['arjun.sharma@gmail.com'], headline: 'Backend engineer' }, 'ats_blob.json'),
      makeSourceProfile('csv', { full_name: 'Aditi Verma', emails: ['aditi.verma@gmail.com'] }, 'row-1'),
    ];

    const clusters = clusterSourceProfiles(profiles);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toHaveLength(2);
    expect(clusters[1]).toHaveLength(1);
  });

  it('links CSV resume_path to uploaded resume filename', () => {
    const csvProfile = makeSourceProfile(
      'csv',
      { full_name: 'Aditi Verma', emails: ['aditi.verma@gmail.com'], resume_ref: 'aditi_verma.txt' },
      'row-1'
    );
    const resumeProfile = makeSourceProfile(
      'resume',
      { full_name: 'Aditi Verma', emails: ['aditi.verma@gmail.com'] },
      'aditi_verma.txt'
    );

    expect(profilesShareIdentity(csvProfile, resumeProfile)).toBe(true);
  });

  it('matches profiles on normalized phone numbers', () => {
    const csvProfile = makeSourceProfile('csv', { phones: ['9998889988'] }, 'row-1');
    const resumeProfile = makeSourceProfile('resume', { phones: ['+91 99988 89988'] }, 'aditi_verma.txt');

    expect(profilesShareIdentity(csvProfile, resumeProfile)).toBe(true);
  });
});
