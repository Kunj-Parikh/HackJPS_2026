import { UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { getDrugs } from "../data/mockData";

export default function DashboardPage() {
  const { user } = useUser();
  const [searches, setSearches] = useState([]);
  const [drugInput, setDrugInput] = useState("");
  const allDrugs = getDrugs();

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
    <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 hero-glow-blob rounded-full pointer-events-none animate-float opacity-40" />
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
      {/* Dashboard Header */}
      <div className="saas-card p-6 md:p-8 animate-fade-in">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-base-content tracking-tight">Dashboard</h1>
            <p className="text-xs md:text-sm font-semibold text-base-content/60 mt-1">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Track a Drug Card */}
      <div className="saas-card p-6 mt-6 animate-fade-in stagger-1">
        <h2 className="text-lg font-black text-base-content mb-4 flex items-center gap-1.5">
          Track a Drug
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
          <button onClick={saveSearch} className="btn btn-primary font-bold text-white px-6">
            Track Drug
          </button>
        </div>
      </div>

      {/* Saved Searches Card */}
      <div className="saas-card p-6 mt-6 animate-fade-in stagger-2">
        <h2 className="text-lg font-black text-base-content mb-4 flex items-center gap-1.5">
          Saved Searches
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
                  className="flex justify-between items-center p-4 bg-base-200/30 hover:bg-base-200/60 border border-base-300/80 rounded-xl shadow-sm hover:border-primary transition-all"
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
