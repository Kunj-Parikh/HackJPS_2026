import { UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";

export default function DashboardPage() {
  const { user } = useUser();
  const [searches, setSearches] = useState([]);
  const [drugInput, setDrugInput] = useState("");

  const loadSearches = async () => {
    if (!user) return;
    const q = query(collection(db, "searches"), where("userId", "==", user.id));
    const snap = await getDocs(q);
    setSearches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadSearches();
  }, [user]);

  const saveSearch = async () => {
    if (!drugInput.trim() || !user) return;
    await addDoc(collection(db, "searches"), {
      userId: user.id,
      drug: drugInput.trim(),
      createdAt: serverTimestamp(),
    });
    setDrugInput("");
    loadSearches();
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>PharmaWatch Dashboard</h1>
        <UserButton />
      </div>
      <p>Signed in as {user?.primaryEmailAddress?.emailAddress}</p>

      <div style={{ marginTop: "2rem" }}>
        <h2>Track a Drug</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={drugInput}
            onChange={(e) => setDrugInput(e.target.value)}
            placeholder="e.g. Ozempic"
            onKeyDown={(e) => e.key === "Enter" && saveSearch()}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <button onClick={saveSearch} style={{ padding: "0.5rem 1rem" }}>Save</button>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Your Saved Searches</h2>
        {searches.length === 0 ? (
          <p>No searches yet.</p>
        ) : (
          <ul>
            {searches.map((s) => (
              <li key={s.id}>{s.drug}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
