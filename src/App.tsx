import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

function WelcomeScreen() {
  return (
    <section>
      <h1>Weird Science</h1>
      <p>A private companion platform with memory, continuity, and dignity.</p>
      <p>This is the first shell for the MVP.</p>
    </section>
  );
}

function ChatScreen() {
  return (
    <section>
      <h1>Chat</h1>
      <p>Companion conversation UI will live here.</p>
    </section>
  );
}

function VaultScreen() {
  return (
    <section>
      <h1>Memory Vault</h1>
      <p>Inspectable memory and relationship history will live here.</p>
    </section>
  );
}

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? "#ffffff" : "#b8b8b8",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  background: isActive ? "#2a2a2a" : "transparent",
});

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          background: "#111111",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #2a2a2a",
            position: "sticky",
            top: 0,
            background: "#111111",
          }}
        >
          <div>
            <strong>Weird Science</strong>
          </div>

          <nav style={{ display: "flex", gap: "10px" }}>
            <NavLink to="/" style={linkStyle} end>
              Welcome
            </NavLink>
            <NavLink to="/chat" style={linkStyle}>
              Chat
            </NavLink>
            <NavLink to="/vault" style={linkStyle}>
              Vault
            </NavLink>
          </nav>
        </header>

        <main style={{ padding: "32px" }}>
          <Routes>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/vault" element={<VaultScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}