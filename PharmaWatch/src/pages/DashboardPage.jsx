import { UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc, serverTimestamp } from "firebase/firestore";

export default function DashboardPage() {
  const { user } = useUser();
  const [searches, setSearches] = useState([]);
  const [drugInput, setDrugInput] = useState("");
  const [allDrugs, setAllDrugs] = useState([]);

  useEffect(() => {
    const fetchDrugs = async () => {
      try {
        const snap = await getDoc(doc(db, "meta", "global"));
        if (snap.exists()) {
          setAllDrugs(snap.data().drugs || []);
        }
      } catch (err) {
        console.error("Error fetching drug list for dashboard:", err);
      }
    };
    fetchDrugs();
  }, []);

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

  const findDrugId = (name) => {
    const d = allDrugs.find(
      (d) =>
        d.brand.toLowerCase() === name.toLowerCase() ||
        d.generic.toLowerCase() === name.toLowerCase()
    );
    return d?.id;
  };

  return (
    <div className="page-shell">
      <div className="page-container max-w-4xl">
      <div className="panel-card p-6 md:p-8">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-base-content">Dashboard</h1>
            <p className="text-sm text-base-content/60 mt-1">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="panel-card p-6 mt-6">
        <h2 className="text-base font-semibold text-base-content mb-4">
          Track a drug
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={drugInput}
            onChange={(e) => setDrugInput(e.target.value)}
            placeholder="e.g. Ozempic, Lexapro, Vyvanse..."
            onKeyDown={(e) => e.key === "Enter" && saveSearch()}
            className="input input-bordered input-primary flex-1 bg-base-200/40 focus:bg-base-100 font-medium"
          />
          <button type="button" onClick={saveSearch} className="btn btn-primary px-6">
            Save
          </button>
        </div>
      </div>

      <div className="panel-card p-6 mt-6">
        <h2 className="text-base font-semibold text-base-content mb-4">
          Saved searches
        </h2>
        {searches.length === 0 ? (
          <p className="text-sm font-medium text-base-content/50 italic py-4">
            No saved searches yet. Start tracking a drug above.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {searches.map((s) => {
              const drugId = findDrugId(s.drug);
              return (
                <div
                  key={s.id}
                  className="flex justify-between items-center p-4 bg-base-200/40 border border-base-300 rounded-xl hover:border-base-content/25 transition-colors"
                >
                  {drugId ? (
                    <Link
                      to={`/drug/${drugId}`}
                      className="font-bold text-base-content hover:text-primary transition-colors hover:underline text-sm md:text-base"
                    >
                      {s.drug}
                    </Link>
                  ) : (
                    <span className="font-bold text-base-content/80 text-sm md:text-base">{s.drug}</span>
                  )}
                  <span className="badge badge-ghost text-[10px] font-bold py-2.5 px-2.5 bg-base-200 text-base-content/75">
                    {s.createdAt?.toDate?.()?.toLocaleDateString() || "Just now"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
