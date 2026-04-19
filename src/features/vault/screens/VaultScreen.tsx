import { Link } from "react-router-dom";

const filters = [
  "All",
  "Preferences",
  "Emotional events",
  "Shared language",
  "Milestones",
  "Routines"
];

export default function VaultScreen(): JSX.Element {
  return (
    <main className="screen-shell">
      <header className="screen-header">
        <div className="screen-copy-stack">
          <p className="eyebrow">Vault</p>
          <div className="hero-status">
            <span className="status-dot" aria-hidden="true" />
            <span className="system-value">Archive interface available</span>
          </div>
          <h1>Inspectable memory</h1>
          <p className="screen-copy">
            This is where remembered details, shared language, and relationship
            moments will stay visible instead of disappearing into a black box.
          </p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" to="/chat">
            Back to chat
          </Link>
        </div>
      </header>

      <div className="pill-row" role="tablist" aria-label="Memory categories">
        {filters.map((filter, index) => (
          <button
            key={filter}
            className={`filter-pill${index === 0 ? " is-active" : ""}`}
            role="tab"
            aria-selected={index === 0}
          >
            {filter}
          </button>
        ))}
      </div>

      <section className="vault-grid">
        <article className="archive-card">
          <p className="archive-index">Record 01</p>
          <h2>No memory cards yet</h2>
          <p>
            As the app starts using the repository layer in the visible UI, this
            space will fill with facts, preferences, emotional events, and the
            phrases that become part of your shared language.
          </p>
        </article>

        <article className="archive-card">
          <p className="archive-index">Record 02</p>
          <h2>Why this matters</h2>
          <ul className="feature-list">
            <li>Memories stay editable and inspectable.</li>
            <li>Retrieved context can be traced back to visible records.</li>
            <li>Forgetting is proportional, not hidden.</li>
          </ul>
        </article>

        <article className="archive-card">
          <p className="archive-index">Record 03</p>
          <h2>Coming next</h2>
          <p>
            Filters, correction flows, and inspectable response links are already
            planned on top of the repository work that now exists underneath.
          </p>
        </article>
      </section>
    </main>
  );
}
