export function PageHero({
  eyebrow,
  title,
  description,
  right
}: {
  eyebrow: string;
  title: string;
  description: string;
  right?: React.ReactNode;
}) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-kicker">
          <span className="hero-kicker-dot" aria-hidden="true" />
          <span>{eyebrow}</span>
          <span className="hero-kicker-note">browser-native workspace</span>
        </div>
        <h2>{title}</h2>
        <p className="hero-description">{description}</p>
      </div>
      <div className="hero-rail">
        <div className="hero-rail-grid">{right}</div>
      </div>
      <span className="hero-orb hero-orb-a" aria-hidden="true" />
      <span className="hero-orb hero-orb-b" aria-hidden="true" />
    </section>
  );
}
