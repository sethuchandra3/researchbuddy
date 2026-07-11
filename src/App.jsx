import { useEffect, useState } from "react";
import Library from "./components/Library.jsx";
import Reader from "./components/Reader.jsx";
import MyPapers from "./components/MyPapers.jsx";
import OnboardingModal from "./components/OnboardingModal.jsx";
import { getPrefs, recordReadArticle } from "./lib/prefs.js";

export default function App() {
  const [paper, setPaper] = useState(null);
  const [view, setView] = useState("library"); // 'library' | 'papers'
  const [showOnboarding, setShowOnboarding] = useState(() => getPrefs() === null);
  const [prefsVersion, setPrefsVersion] = useState(0); // bump → refresh picks

  // Browser Back returns into the app instead of leaving it
  useEffect(() => {
    const onPop = () => {
      setPaper(null);
      setView("library");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function openPaper(p) {
    window.history.pushState({ reader: true }, "", "#read");
    recordReadArticle(p);
    setPaper(p);
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (window.history.state?.reader || window.history.state?.papers) {
      window.history.back();
    } else {
      setPaper(null);
      setView("library");
    }
  }

  function showPapers() {
    window.history.pushState({ papers: true }, "", "#papers");
    setView("papers");
    window.scrollTo(0, 0);
  }

  const editPrefs = () => setShowOnboarding(true);

  return (
    <>
      {paper ? (
        <Reader paper={paper} onBack={goBack} onEditPrefs={editPrefs} />
      ) : view === "papers" ? (
        <MyPapers onOpenPaper={openPaper} onBack={goBack} />
      ) : (
        <Library
          onOpenPaper={openPaper}
          onShowPapers={showPapers}
          onEditPrefs={editPrefs}
          prefsVersion={prefsVersion}
        />
      )}
      {showOnboarding && (
        <OnboardingModal
          onDone={() => {
            setShowOnboarding(false);
            setPrefsVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
