import type { ViewProps } from '../types';
import { Button, Pill } from '../ui';
import { Icon } from '../icons';

/**
 * Profile editor — one source of truth stored as `profile.yaml`.
 * Left column: editable basics / experience / education / skills.
 * Right rail: saved-state (file, version, validation) and live summary.
 */
export function ProfileView({ data, actions }: ViewProps) {
  const { profile } = data;

  const setBasics = (patch: Partial<typeof profile>) =>
    actions.update({ profile: { ...profile, ...patch } });

  const setExperience = (index: number, highlights: string) =>
    actions.update({
      profile: {
        ...profile,
        experience: profile.experience.map((x, i) => (i === index ? { ...x, highlights } : x)),
      },
    });

  const initials = profile.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div data-od-id="od-view-profile">
      <div className="view-head">
        <div>
          <h1>Profile</h1>
          <p>
            Single source of truth for your applications — stored as{' '}
            <code style={{ fontFamily: 'var(--mono)', fontSize: '12.5px' }}>profile.yaml</code> in
            your workspace.
          </p>
        </div>
        <div className="view-actions">
          <Button variant="ghost" dataOdId="od-btn-import-profile" onClick={() => actions.openModal('import')}>
            <Icon n="plus" size={15} />
            Import YAML/JSON
          </Button>
          <Button variant="primary" dataOdId="od-btn-save-profile" onClick={actions.saveProfile}>
            Save profile
          </Button>
        </div>
      </div>

      <div className="profile-grid">
        <div className="card card-pad">
          <div className="sect-title">Basics</div>
          <div className="form-grid2">
            <div className="field">
              <label htmlFor="pf-name">Full name</label>
              <input
                id="pf-name"
                className="input"
                value={profile.name}
                onChange={(e) => setBasics({ name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-mail">Email</label>
              <input
                id="pf-mail"
                className="input"
                value={profile.email}
                onChange={(e) => setBasics({ email: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="pf-head">Headline</label>
              <input
                id="pf-head"
                className="input"
                value={profile.headline}
                onChange={(e) => setBasics({ headline: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="pf-loc">Location</label>
              <input
                id="pf-loc"
                className="input"
                value={profile.location}
                onChange={(e) => setBasics({ location: e.target.value })}
              />
            </div>
          </div>

          <div className="sect-title">Experience</div>
          {profile.experience.map((x, i) => (
            <div className="entry" key={`${x.company}-${i}`}>
              <div className="entry-head">
                <b>{x.role}</b>
                <span>{x.years}</span>
              </div>
              <div className="entry-head" style={{ marginTop: 2 }}>
                <span style={{ color: 'var(--muted-2)', fontSize: '12px' }}>{x.company}</span>
              </div>
              <textarea
                className="ta ta-mono"
                style={{ marginTop: 10, minHeight: 64, fontSize: '12px' }}
                value={x.highlights}
                onChange={(e) => setExperience(i, e.target.value)}
              />
            </div>
          ))}

          <div className="sect-title">Education</div>
          <div className="entry">
            <div className="entry-head">
              <b>{profile.education[0].degree}</b>
              <span>{profile.education[0].years}</span>
            </div>
            <div style={{ marginTop: 2, fontSize: '12px', color: 'var(--muted-2)' }}>
              {profile.education[0].school}
            </div>
          </div>

          <div className="sect-title">Skills</div>
          <div className="skills-box">
            {profile.skills.map((sk) => (
              <span className="skill-chip" key={sk}>
                {sk}
              </span>
            ))}
          </div>
        </div>

        <div className="rail">
          <div className="card card-pad" data-od-id="od-saved-state">
            <div className="card-head">
              <div>
                <div className="card-title">Saved state</div>
                <div className="card-sub">Written to disk on save</div>
              </div>
              <Pill tone="ok">Validated</Pill>
            </div>
            <div className="st-row">
              <span>File</span>
              <b className="mono">profile.yaml</b>
            </div>
            <div className="st-row">
              <span>Version</span>
              <b>v{profile.version}</b>
            </div>
            <div className="st-row">
              <span>Saved</span>
              <b>{profile.savedAt}</b>
            </div>
            <div className="st-row">
              <span>Last import</span>
              <b className="mono">{profile.lastImport}</b>
            </div>
            <div className="st-row">
              <span>Validation</span>
              <b>All sections complete</b>
            </div>
          </div>

          <div className="card summary-card" data-od-id="od-profile-summary">
            <div className="summary-top">
              <div className="avatar">{initials}</div>
              <div>
                <b>{profile.name}</b>
                <span>{profile.location}</span>
              </div>
            </div>
            <p className="card-sub" style={{ lineHeight: 1.55 }}>
              {profile.headline}
            </p>
            <div className="summary-skills">
              {profile.skills.slice(0, 4).map((sk) => (
                <span className="skill-chip" key={sk}>
                  {sk}
                </span>
              ))}
              <span className="skill-chip" style={{ color: 'var(--muted-2)' }}>
                +{profile.skills.length - 4}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}