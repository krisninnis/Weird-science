import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { getCompanionById } from "@/features/companion/repository/companionRepository";
import ChatScreen from "@/features/chat/screens/ChatScreen";
import ConciergeScreen from "@/features/onboarding/screens/ConciergeScreen";
import { getOnboardingSelection } from "@/features/onboarding/onboardingStorage";
import {
  getRelationshipState,
  updateTrust
} from "@/features/relationship/repository/relationshipRepository";

type CompanionView = {
  id: string;
  name: string;
  archetype: string;
} | null;

type RelationshipView = {
  phase: string;
  chapter: string | null;
  trust: number;
  familiarity: number;
} | null;

function WelcomeScreen() {
  const [companion, setCompanion] = useState<CompanionView>(null);
  const [relationship, setRelationship] = useState<RelationshipView>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<
    "mara" | "iris" | "rowan"
  >("rowan");

  useEffect(() => {
    const onboarding = getOnboardingSelection();
    if (onboarding?.companionId) {
      setSelectedCompanionId(onboarding.companionId);
    }
  }, []);

  useEffect(() => {
    async function loadInitialState() {
      const companionRow = await getCompanionById(selectedCompanionId);
      const relationshipRow = await getRelationshipState(selectedCompanionId);

      setCompanion(
        companionRow
          ? {
              id: companionRow.id,
              name: companionRow.name,
              archetype: companionRow.archetype
            }
          : null
      );

      setRelationship(
        relationshipRow
          ? {
              phase: relationshipRow.phase,
              chapter: relationshipRow.chapter,
              trust: relationshipRow.trust,
              familiarity: relationshipRow.familiarity
            }
          : null
      );
    }

    void loadInitialState();
  }, [selectedCompanionId]);

  async function handleIncreaseTrust() {
    if (!relationship) return;

    const newTrust = Number((relationship.trust + 0.1).toFixed(2));
    await updateTrust(selectedCompanionId, newTrust);

    const updatedRelationship = await getRelationshipState(selectedCompanionId);

    setRelationship(
      updatedRelationship
        ? {
            phase: updatedRelationship.phase,
            chapter: updatedRelationship.chapter,
            trust: updatedRelationship.trust,
            familiarity: updatedRelationship.familiarity
          }
        : null
    );
  }

  return (
    <section>
      <h1>Weird Science</h1>
      <p>A private companion platform with memory, continuity, and dignity.</p>

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          border: "1px solid #333",
          borderRadius: "12px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Selected Companion</h2>
        {companion ? (
          <>
            <p>
              <strong>Name:</strong> {companion.name}
            </p>
            <p>
              <strong>ID:</strong> {companion.id}
            </p>
            <p>
              <strong>Archetype:</strong> {companion.archetype}
            </p>
          </>
        ) : (
          <p>No companion loaded yet.</p>
        )}
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "16px",
          border: "1px solid #333",
          borderRadius: "12px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Relationship State</h2>
        {relationship ? (
          <>
            <p>
              <strong>Phase:</strong> {relationship.phase}
            </p>
            <p>
              <strong>Chapter:</strong> {relationship.chapter ?? "none"}
            </p>
            <p>
              <strong>Trust:</strong> {relationship.trust}
            </p>
            <p>
              <strong>Familiarity:</strong> {relationship.familiarity}
            </p>

            <button
              onClick={() => {
                void handleIncreaseTrust();
              }}
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #444",
                background: "#2a2a2a",
                color: "#ffffff",
                cursor: "pointer"
              }}
            >
              Increase Trust
            </button>
          </>
        ) : (
          <p>No relationship state loaded yet.</p>
        )}
      </div>
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
  background: isActive ? "#2a2a2a" : "transparent"
});

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          background: "#111111",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif"
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
            background: "#111111"
          }}
        >
          <div>
            <strong>Weird Science</strong>
          </div>

          <nav style={{ display: "flex", gap: "10px" }}>
            <NavLink to="/" style={linkStyle} end>
              Welcome
            </NavLink>
            <NavLink to="/concierge" style={linkStyle}>
              Concierge
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
            <Route path="/concierge" element={<ConciergeScreen />} />
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/vault" element={<VaultScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}